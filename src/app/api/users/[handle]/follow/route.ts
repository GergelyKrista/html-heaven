import { NextRequest, NextResponse } from "next/server";
import { auth, githubFieldsFromSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getProfileByHandle, follow, unfollow, isFollowing, ensureUserWithHandle } from "@/lib/users";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const originGate = assertSameOrigin(request);
  if (originGate) return originGate;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { handle } = await params;
  try {
    const db = await getDB();

    // Make sure the caller has a user row (first-time visitors)
    const { githubLogin, gh } = githubFieldsFromSession(session.user);
    await ensureUserWithHandle(
      db,
      session.user.email,
      session.user.name || "Anonymous",
      session.user.image || null,
      githubLogin,
      gh
    );

    const target = await getProfileByHandle(db, handle);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.id === session.user.email) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const currentlyFollowing = await isFollowing(db, session.user.email, target.id);
    if (currentlyFollowing) {
      await unfollow(db, session.user.email, target.id);
      return NextResponse.json({ following: false });
    }
    await follow(db, session.user.email, target.id);
    return NextResponse.json({ following: true });
  } catch (error) {
    console.error("Follow toggle error:", error);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
