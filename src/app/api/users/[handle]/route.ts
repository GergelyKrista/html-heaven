import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getProfileByHandle, getProfileStats, isFollowing, getUserAppSlugs } from "@/lib/users";

export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const profile = await getProfileByHandle(db, handle);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const stats = await getProfileStats(db, profile.id);
    const appSlugs = await getUserAppSlugs(db, profile.id);

    // Whether the current viewer follows this user
    const session = await auth();
    let followedByMe = false;
    if (session?.user?.email && session.user.email !== profile.id) {
      followedByMe = await isFollowing(db, session.user.email, profile.id);
    }

    return NextResponse.json({
      profile,
      stats,
      appSlugs,
      followedByMe,
      isSelf: session?.user?.email === profile.id,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
