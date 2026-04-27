import { NextResponse } from "next/server";
import { auth, resolveUserId } from "@/lib/auth";
import { getDB } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId = resolveUserId(session?.user);
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const db = await getDB();

    const [favorites, likes, comments] = await Promise.all([
      db.prepare("SELECT app_slug, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
        .bind(userId).all<{ app_slug: string; created_at: string }>(),
      db.prepare("SELECT app_slug, created_at FROM likes WHERE user_id = ? ORDER BY created_at DESC")
        .bind(userId).all<{ app_slug: string; created_at: string }>(),
      db.prepare("SELECT id, app_slug, text, created_at FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
        .bind(userId).all<{ id: number; app_slug: string; text: string; created_at: string }>(),
    ]);

    return NextResponse.json({
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      favorites: favorites.results.map((r) => ({ slug: r.app_slug, createdAt: r.created_at })),
      likes: likes.results.map((r) => ({ slug: r.app_slug, createdAt: r.created_at })),
      comments: comments.results.map((r) => ({
        id: r.id,
        appSlug: r.app_slug,
        text: r.text,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
