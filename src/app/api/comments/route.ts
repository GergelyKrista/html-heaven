import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB, ensureUser, getComments, addComment, getUserCommentCount } from "@/lib/db";
import { postCommentToPR } from "@/lib/github";
import { assertSameOrigin } from "@/lib/security";

const MAX_COMMENT_LENGTH = 500;
const COMMENTS_PER_HOUR = 10;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const comments = await getComments(db, slug);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const originGate = assertSameOrigin(request);
  if (originGate) return originGate;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json() as { slug?: string; text?: string };
    const { slug, text } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comment too long (max ${MAX_COMMENT_LENGTH} chars)` }, { status: 400 });
    }

    const db = await getDB();
    const userId = session.user.email;
    const userName = session.user.name || "Anonymous";
    const userAvatar = session.user.image || null;

    // Rate limit
    const recentCount = await getUserCommentCount(db, userId, 1);
    if (recentCount >= COMMENTS_PER_HOUR) {
      return NextResponse.json({ error: "Too many comments. Try again later." }, { status: 429 });
    }

    await ensureUser(db, userId, userName, userAvatar);
    await addComment(db, userId, userName, userAvatar, slug, text.trim());

    // Post to GitHub PR (best effort — don't fail the request if this fails)
    try {
      await postCommentToPR(slug, text.trim(), userName);
    } catch {
      // Silently skip if PR not found or GitHub API fails
    }

    const comments = await getComments(db, slug);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
