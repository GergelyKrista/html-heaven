import { NextRequest, NextResponse } from "next/server";
import { auth, resolveUserId } from "@/lib/auth";
import { getDB, ensureUser, getUserFavorites, toggleFavorite } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

export async function GET() {
  const session = await auth();
  const userId = resolveUserId(session?.user);
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const db = await getDB();
    const favorites = await getUserFavorites(db, userId);
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Favorites GET error:", error);
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 });
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
    const { slug } = await request.json() as { slug?: string };
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const db = await getDB();
    await ensureUser(db, userId, session.user.name || "Anonymous", session.user.image || null);
    const isFavorited = await toggleFavorite(db, userId, slug);

    return NextResponse.json({ favorited: isFavorited });
  } catch (error) {
    console.error("Favorites POST error:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
