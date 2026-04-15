import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext();
  return (env as Record<string, unknown>).DB as D1Database;
}

// Upsert user on sign-in (called from API routes)
export async function ensureUser(
  db: D1Database,
  id: string,
  name: string,
  avatar: string | null
) {
  await db
    .prepare(
      `INSERT INTO users (id, name, avatar) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = ?, avatar = ?`
    )
    .bind(id, name, avatar, name, avatar)
    .run();
}

// Favorites
export async function getUserFavorites(db: D1Database, userId: string): Promise<string[]> {
  const result = await db
    .prepare("SELECT app_slug FROM favorites WHERE user_id = ?")
    .bind(userId)
    .all<{ app_slug: string }>();
  return result.results.map((r) => r.app_slug);
}

export async function toggleFavorite(db: D1Database, userId: string, slug: string): Promise<boolean> {
  const existing = await db
    .prepare("SELECT 1 FROM favorites WHERE user_id = ? AND app_slug = ?")
    .bind(userId, slug)
    .first();

  if (existing) {
    await db.prepare("DELETE FROM favorites WHERE user_id = ? AND app_slug = ?").bind(userId, slug).run();
    return false;
  } else {
    await db.prepare("INSERT INTO favorites (user_id, app_slug) VALUES (?, ?)").bind(userId, slug).run();
    return true;
  }
}

export async function getFavoriteCount(db: D1Database, slug: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM favorites WHERE app_slug = ?")
    .bind(slug)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

// Likes
export async function toggleLike(db: D1Database, userId: string, slug: string): Promise<boolean> {
  const existing = await db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND app_slug = ?")
    .bind(userId, slug)
    .first();

  if (existing) {
    await db.prepare("DELETE FROM likes WHERE user_id = ? AND app_slug = ?").bind(userId, slug).run();
    return false;
  } else {
    await db.prepare("INSERT INTO likes (user_id, app_slug) VALUES (?, ?)").bind(userId, slug).run();
    return true;
  }
}

export async function getLikeCount(db: D1Database, slug: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM likes WHERE app_slug = ?")
    .bind(slug)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function hasUserLiked(db: D1Database, userId: string, slug: string): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND app_slug = ?")
    .bind(userId, slug)
    .first();
  return !!result;
}

export async function hasUserFavorited(db: D1Database, userId: string, slug: string): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM favorites WHERE user_id = ? AND app_slug = ?")
    .bind(userId, slug)
    .first();
  return !!result;
}

// Comments
export async function getComments(db: D1Database, slug: string) {
  const result = await db
    .prepare(
      "SELECT id, user_name, user_avatar, app_slug, text, created_at FROM comments WHERE app_slug = ? ORDER BY created_at DESC LIMIT 50"
    )
    .bind(slug)
    .all<{
      id: number;
      user_name: string;
      user_avatar: string | null;
      app_slug: string;
      text: string;
      created_at: string;
    }>();
  return result.results.map((r) => ({
    id: r.id,
    userName: r.user_name,
    userAvatar: r.user_avatar,
    appSlug: r.app_slug,
    text: r.text,
    createdAt: r.created_at,
  }));
}

export async function addComment(
  db: D1Database,
  userId: string,
  userName: string,
  userAvatar: string | null,
  slug: string,
  text: string
) {
  await db
    .prepare(
      "INSERT INTO comments (user_id, user_name, user_avatar, app_slug, text) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(userId, userName, userAvatar, slug, text)
    .run();
}

export async function getUserCommentCount(db: D1Database, userId: string, sinceHoursAgo: number): Promise<number> {
  const result = await db
    .prepare(
      "SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at > datetime('now', ?)"
    )
    .bind(userId, `-${sinceHoursAgo} hours`)
    .first<{ count: number }>();
  return result?.count ?? 0;
}
