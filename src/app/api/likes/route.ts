import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB, ensureUser, toggleLike, getLikeCount, hasUserLiked } from "@/lib/db";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const count = await getLikeCount(db, slug);

    const session = await auth();
    const liked = session?.user?.email
      ? await hasUserLiked(db, session.user.email, slug)
      : false;

    return NextResponse.json({ count, liked });
  } catch (error) {
    console.error("Likes GET error:", error);
    return NextResponse.json({ error: "Failed to load likes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { slug } = await request.json() as { slug?: string };
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const db = await getDB();
    await ensureUser(db, session.user.email, session.user.name || "Anonymous", session.user.image || null);
    const isLiked = await toggleLike(db, session.user.email, slug);
    const count = await getLikeCount(db, slug);

    return NextResponse.json({ liked: isLiked, count });
  } catch (error) {
    console.error("Likes POST error:", error);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}
