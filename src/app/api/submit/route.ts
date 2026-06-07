import { NextRequest, NextResponse } from "next/server";
import { auth, githubFieldsFromSession, resolveUserId } from "@/lib/auth";
import { createSubmissionPR, checkSlugAvailability } from "@/lib/github";
import { normalizeTag, isValidCategory, TAG_RULES } from "@/lib/categories";
import { getDB, recordSubmission } from "@/lib/db";
import { ensureUserWithHandle } from "@/lib/users";
import { assertSameOrigin } from "@/lib/security";
import { checkAndRecord } from "@/lib/ratelimit";

const SUBMIT_LIMIT_PER_HOUR = 3;

export async function POST(request: NextRequest) {
  const originGate = assertSameOrigin(request);
  if (originGate) return originGate;

  const session = await auth();

  const userId = resolveUserId(session?.user);
  if (!session?.user || !userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // D1-backed rate limit. A Worker-level in-memory Map wouldn't survive
  // cold starts or cross-instance traffic.
  try {
    const db = await getDB();
    const { allowed } = await checkAndRecord(
      db,
      userId,
      "submit",
      60 * 60,
      SUBMIT_LIMIT_PER_HOUR
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait before trying again." },
        { status: 429 }
      );
    }
  } catch (err) {
    // If D1 is unreachable, fail open — don't block legitimate submitters
    // over infra issues. Abuse is still bounded by auth + manual review.
    console.error("Rate limit check failed:", err);
  }

  try {
    const formData = await request.formData();
    const hostingType = ((formData.get("hostingType") as string) || "bundled").trim();
    const title = ((formData.get("title") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim();
    const category = ((formData.get("category") as string) || "").trim();
    // Skill flag: only bundled apps qualify (agents fetch our hosted file).
    // The reviewer confirms the claim in PR review.
    const skill = hostingType === "bundled" && formData.get("skill") === "true";

    if (hostingType !== "bundled" && hostingType !== "external") {
      return NextResponse.json(
        { error: "Invalid hostingType. Expected 'bundled' or 'external'." },
        { status: 400 }
      );
    }

    // Category is required and must be from the known list
    if (!category || !isValidCategory(category)) {
      return NextResponse.json(
        { error: "A valid category is required." },
        { status: 400 }
      );
    }

    // Parse & sanitize tags. Custom tags are allowed as long as they
    // pass normalization. Duplicates are removed.
    let tags: string[] = [];
    try {
      const rawTags = JSON.parse((formData.get("tags") as string) || "[]");
      if (Array.isArray(rawTags)) {
        const seen = new Set<string>();
        for (const raw of rawTags) {
          const n = normalizeTag(String(raw));
          if (n && !seen.has(n)) {
            seen.add(n);
            tags.push(n);
          }
        }
      }
    } catch {
      // Malformed JSON → fall back to empty tags
    }

    // Ensure category sits first in tags (removing any accidental dup)
    tags = [category, ...tags.filter((t) => t !== category)].slice(
      0,
      TAG_RULES.maxCount + 1 // +1 for category itself
    );

    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (title.length > 100 || description.length > 1000) {
      return NextResponse.json(
        { error: "Title or description too long." },
        { status: 400 }
      );
    }

    // Generate slug and validate it's non-empty
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug || slug.length < 2 || slug.length > 80) {
      return NextResponse.json(
        { error: "Title must produce a valid URL slug (at least 2 characters)." },
        { status: 400 }
      );
    }

    // Refuse to overwrite an existing app. Without this, two users
    // submitting apps with the same title produce the same slug, and
    // the second merge silently overwrites the first's index.html +
    // app.json — meanwhile the D1 submissions row still points at the
    // original submitter because we use ON CONFLICT DO NOTHING there.
    const availability = await checkSlugAvailability(slug);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.message ?? "That slug is already taken." },
        { status: 409 }
      );
    }

    // Branch on submission type. Bundled submissions carry an HTML file
    // that we commit to apps/<slug>/index.html; external submissions
    // carry a URL that we drop into app.json only.
    let htmlContent: string | undefined;
    let externalUrl: string | undefined;

    if (hostingType === "bundled") {
      const htmlFile = formData.get("html") as File | null;
      if (!htmlFile) {
        return NextResponse.json(
          { error: "Bundled submissions must include an HTML file." },
          { status: 400 }
        );
      }
      if (htmlFile.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 2MB." },
          { status: 400 }
        );
      }
      htmlContent = await htmlFile.text();
    } else {
      // external
      const rawUrl = ((formData.get("externalUrl") as string) || "").trim();
      if (!rawUrl) {
        return NextResponse.json(
          { error: "External submissions must include a URL." },
          { status: 400 }
        );
      }
      if (!/^https:\/\//i.test(rawUrl)) {
        return NextResponse.json(
          { error: "External URL must start with https://" },
          { status: 400 }
        );
      }
      try {
        const parsed = new URL(rawUrl);
        // Reject anything that resolves to our own domain — if they want
        // that, it should go through the bundled path.
        if (/(^|\.)htmlheaven\.com$/i.test(parsed.hostname)) {
          return NextResponse.json(
            { error: "Use the bundled path for apps you want hosted on htmlheaven.com." },
            { status: 400 }
          );
        }
        externalUrl = parsed.toString();
      } catch {
        return NextResponse.json(
          { error: "External URL is not a valid URL." },
          { status: 400 }
        );
      }
    }

    const prUrl = await createSubmissionPR({
      slug,
      hostingType,
      htmlContent,
      externalUrl,
      metadata: {
        title,
        description,
        author: session.user.name || "Anonymous",
        tags,
        skill,
      },
      submitterName: session.user.name || "Anonymous",
    });

    // Record the submission for ownership on delete + ensure the
    // submitter has a user row (so their profile exists). Best-effort —
    // if this fails, the PR still exists and admin can still merge.
    try {
      const db = await getDB();
      const { githubLogin, gh } = githubFieldsFromSession(session.user);
      await ensureUserWithHandle(
        db,
        userId,
        session.user.name || "Anonymous",
        session.user.image || null,
        githubLogin,
        gh
      );
      await recordSubmission(
        db,
        slug,
        userId,
        session.user.name || "Anonymous"
      );
    } catch (err) {
      console.error("recordSubmission failed:", err);
    }

    return NextResponse.json({ success: true, prUrl });
  } catch (error) {
    console.error(
      "Submission error:",
      error instanceof Error ? error.message : error
    );
    return classifySubmissionError(error);
  }
}

/**
 * Turns whatever Octokit / network / D1 threw into a useful response.
 *
 * Most submission failures originate at GitHub:
 *   - secondary rate limit on rapid PR creation → 403 with "abuse" /
 *     "secondary" in the message → we surface as 429 so the submitter
 *     gets the right "wait and retry" framing.
 *   - upstream 5xx / 504 → we surface as 502 ("GitHub is having a moment").
 *   - 401 / 403 on the PAT itself → we surface as 502 with a "site is
 *     misconfigured" message; that's an admin problem, not the user's.
 *
 * Anything we can't classify falls through to the generic 500.
 */
function classifySubmissionError(error: unknown): NextResponse {
  const ghStatus = getGithubStatus(error);
  const ghMessage = errorMessage(error).toLowerCase();

  if (ghStatus === 403 && /abuse|secondary rate/.test(ghMessage)) {
    return NextResponse.json(
      {
        error:
          "GitHub is rate-limiting submissions right now (too many PRs in a short window). Try again in 5–10 minutes.",
      },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  if (ghStatus === 429) {
    return NextResponse.json(
      {
        error: "GitHub rate-limited the submission. Try again in a few minutes.",
      },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  if (ghStatus === 401 || ghStatus === 403) {
    // Auth or scope problem with our PAT — the user can't fix this.
    return NextResponse.json(
      {
        error:
          "Submission can't reach GitHub right now. The site admin has been notified.",
      },
      { status: 502 }
    );
  }

  if (typeof ghStatus === "number" && ghStatus >= 500) {
    return NextResponse.json(
      { error: "GitHub is having a moment. Try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { error: "Submission failed. Please try again later." },
    { status: 500 }
  );
}

// Octokit's RequestError carries .status with the upstream HTTP status.
function getGithubStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}
