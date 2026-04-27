import { NextRequest, NextResponse } from "next/server";
import { auth, resolveUserId } from "@/lib/auth";
import {
  getDB,
  ensureUser,
  getComments,
  addComment,
  getCommentParentInfo,
} from "@/lib/db";
import { postCommentToPR } from "@/lib/github";
import { assertSameOrigin } from "@/lib/security";
import { checkAndRecord } from "@/lib/ratelimit";

const MAX_COMMENT_LENGTH = 500;
const COMMENTS_PER_HOUR = 10;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const db = await getDB();
    // Pass the viewer id so getComments can include their own vote
    // alongside the aggregate score.
    const session = await auth();
    const viewerId = resolveUserId(session?.user);
    const comments = await getComments(db, slug, viewerId);
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
  const userId = resolveUserId(session?.user);
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      slug?: string;
      text?: string;
      parentId?: number | null;
    };
    const { slug, text } = body;
    const rawParent = body.parentId;

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
    const userName = session.user.name || "Anonymous";
    const userAvatar = session.user.image || null;

    // Resolve a parent reference if the client sent one. We allow only
    // one level of nesting: replies must point at a top-level comment
    // and must belong to the same app.
    let parentId: number | null = null;
    if (rawParent != null) {
      if (typeof rawParent !== "number" || !Number.isFinite(rawParent) || rawParent <= 0) {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }
      const parent = await getCommentParentInfo(db, rawParent);
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
      }
      if (parent.appSlug !== slug) {
        return NextResponse.json(
          { error: "Parent comment belongs to a different app" },
          { status: 400 }
        );
      }
      // Flatten: if the user clicked Reply on something that was itself
      // a reply, redirect the new comment to the original top-level
      // parent so the thread stays one level deep.
      parentId = parent.parentId ?? rawParent;
    }

    const { allowed } = await checkAndRecord(db, userId, "comment", 60 * 60, COMMENTS_PER_HOUR);
    if (!allowed) {
      return NextResponse.json({ error: "Too many comments. Try again later." }, { status: 429 });
    }

    await ensureUser(db, userId, userName, userAvatar);
    await addComment(db, userId, userName, userAvatar, slug, text.trim(), parentId);

    // Post to GitHub PR (best effort — don't fail the request if this
    // fails; replies are not mirrored to GitHub).
    if (parentId === null) {
      try {
        await postCommentToPR(slug, text.trim(), userName);
      } catch {
        // Silently skip if PR not found or GitHub API fails
      }
    }

    const comments = await getComments(db, slug, userId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
