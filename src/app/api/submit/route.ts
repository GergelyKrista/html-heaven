import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSubmissionPR } from "@/lib/github";

const ALLOWED_TAGS = new Set([
  "games", "creative", "art", "tools", "design",
  "productivity", "utilities", "education", "fun",
]);

// Simple in-memory rate limit: 3 submissions per user per hour
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(
    (t) => now - t < RATE_WINDOW
  );
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userId = session.user.email || session.user.name || "unknown";
  if (isRateLimited(userId)) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before trying again." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const htmlFile = formData.get("html") as File | null;
    const title = (formData.get("title") as string || "").trim();
    const description = (formData.get("description") as string || "").trim();

    // Parse tags safely
    let tags: string[] = [];
    try {
      const rawTags = JSON.parse(formData.get("tags") as string);
      if (Array.isArray(rawTags)) {
        tags = rawTags.filter((t): t is string =>
          typeof t === "string" && ALLOWED_TAGS.has(t)
        );
      }
    } catch {
      // Invalid tags JSON — continue with empty tags
    }

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

    return NextResponse.json({ success: true, prUrl });
  } catch (error) {
    console.error("Submission error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Submission failed. Please try again later." },
      { status: 500 }
    );
  }
}
