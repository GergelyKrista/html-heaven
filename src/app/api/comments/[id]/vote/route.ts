import { NextRequest, NextResponse } from "next/server";
import { auth, resolveUserId } from "@/lib/auth";
import { getDB, ensureUser, setCommentVote, getCommentSlug } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { checkAndRecord } from "@/lib/ratelimit";

const VOTES_PER_HOUR = 100;

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/comments/<id>/vote
 * Body: { value: -1 | 0 | 1 }
 *
 * value=1 upvotes, value=-1 downvotes, value=0 clears the viewer's vote.
 * Idempotent — calling twice with the same value is a no-op past the
 * first write.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const originGate = assertSameOrigin(request);
  if (originGate) return originGate;

  const session = await auth();
  const userId = resolveUserId(session?.user);
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const commentId = Number.parseInt(id, 10);
  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }

  let body: { value?: number };
  try {
    body = (await request.json()) as { value?: number };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const value = body.value;
  if (value !== -1 && value !== 0 && value !== 1) {
    return NextResponse.json(
      { error: "value must be -1, 0, or 1" },
      { status: 400 }
    );
  }

  const db = await getDB();

  // Confirm the comment actually exists before letting the user spam
  // votes against bogus IDs.
  const slug = await getCommentSlug(db, commentId);
  if (!slug) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Loose rate limit so a script can't grind out millions of toggles.
  const { allowed } = await checkAndRecord(
    db,
    userId,
    "comment-vote",
    60 * 60,
    VOTES_PER_HOUR
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many votes. Try again later." },
      { status: 429 }
    );
  }

  await ensureUser(
    db,
    userId,
    session.user.name || "Anonymous",
    session.user.image || null
  );

  const result = await setCommentVote(db, userId, commentId, value as -1 | 0 | 1);
  return NextResponse.json(result);
}
