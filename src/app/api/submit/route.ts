import { NextRequest, NextResponse } from "next/server";
import { auth, githubFieldsFromSession } from "@/lib/auth";
import { createSubmissionPR } from "@/lib/github";
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

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userId = session.user.email || session.user.name || "unknown";

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
    const htmlFile = formData.get("html") as File | null;
    const title = ((formData.get("title") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim();
    const category = ((formData.get("category") as string) || "").trim();

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

    if (!htmlFile || !title || !description) {
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

    if (htmlFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
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

    const htmlContent = await htmlFile.text();

    const prUrl = await createSubmissionPR({
      slug,
      htmlContent,
      metadata: {
        title,
        description,
        author: session.user.name || "Anonymous",
        tags,
      },
      submitterName: session.user.name || "Anonymous",
      submitterEmail: session.user.email || "",
    });

    // Record the submission for ownership on delete + ensure the
    // submitter has a user row (so their profile exists). Best-effort —
    // if this fails, the PR still exists and admin can still merge.
    try {
      const db = await getDB();
      const { githubLogin, gh } = githubFieldsFromSession(session.user);
      await ensureUserWithHandle(
        db,
        session.user.email || "unknown",
        session.user.name || "Anonymous",
        session.user.image || null,
        githubLogin,
        gh
      );
      await recordSubmission(
        db,
        slug,
        session.user.email || "unknown",
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
    return NextResponse.json(
      { error: "Submission failed. Please try again later." },
      { status: 500 }
    );
  }
}
