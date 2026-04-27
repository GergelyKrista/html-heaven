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

// Comments — joined against comment_votes to return aggregate score
// and the requesting viewer's own vote, then assembled into a tree.
//
// Top-level comments are sorted by score DESC (so the most-upvoted
// floats to the top), with created_at DESC as a tiebreaker. Replies
// under each parent are sorted by created_at ASC so the conversation
// reads in order.
//
// We fetch up to 200 comments (top-level + replies combined) which is
// plenty for any one app's preview modal; thread-heavy apps can paginate
// later. Pass viewerId=null for unauthenticated callers.
export async function getComments(
  db: D1Database,
  slug: string,
  viewerId: string | null = null
) {
  const result = await db
    .prepare(
      `SELECT
         c.id, c.user_name, c.user_avatar, c.app_slug, c.text, c.created_at, c.parent_id,
         COALESCE(SUM(v.value), 0)         AS score,
         COALESCE(SUM(CASE WHEN v.user_id = ? THEN v.value ELSE 0 END), 0) AS user_vote
       FROM comments c
       LEFT JOIN comment_votes v ON v.comment_id = c.id
       WHERE c.app_slug = ?
       GROUP BY c.id
       ORDER BY c.created_at ASC
       LIMIT 200`
    )
    .bind(viewerId ?? "", slug)
    .all<{
      id: number;
      user_name: string;
      user_avatar: string | null;
      app_slug: string;
      text: string;
      created_at: string;
      parent_id: number | null;
      score: number;
      user_vote: number;
    }>();

  type CommentRow = {
    id: number;
    userName: string;
    userAvatar: string | null;
    appSlug: string;
    text: string;
    createdAt: string;
    score: number;
    userVote: -1 | 0 | 1;
    parentId: number | null;
    replies?: CommentRow[];
  };

  const all: CommentRow[] = result.results.map((r) => ({
    id: r.id,
    userName: r.user_name,
    userAvatar: r.user_avatar,
    appSlug: r.app_slug,
    text: r.text,
    createdAt: r.created_at,
    score: r.score ?? 0,
    userVote: (r.user_vote === 1 ? 1 : r.user_vote === -1 ? -1 : 0) as -1 | 0 | 1,
    parentId: r.parent_id,
  }));

  const byId = new Map<number, CommentRow>();
  const topLevel: CommentRow[] = [];
  for (const c of all) {
    byId.set(c.id, c);
    if (c.parentId === null) {
      c.replies = [];
      topLevel.push(c);
    }
  }
  // Walk a second time to attach replies. Replies whose parent has
  // disappeared (shouldn't happen but defensively) are silently dropped.
  for (const c of all) {
    if (c.parentId !== null) {
      const parent = byId.get(c.parentId);
      if (parent && parent.replies) parent.replies.push(c);
    }
  }
  // Top-level: highest score first, recency as tiebreaker.
  topLevel.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  // Replies: chronological so a thread reads in order.
  for (const t of topLevel) {
    t.replies?.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return topLevel;
}

/**
 * Set the viewer's vote on a comment. value=1 upvotes, value=-1
 * downvotes, value=0 clears the vote. Returns the new aggregate score
 * after the change.
 */
export async function setCommentVote(
  db: D1Database,
  userId: string,
  commentId: number,
  value: -1 | 0 | 1
): Promise<{ score: number; userVote: -1 | 0 | 1 }> {
  if (value === 0) {
    await db
      .prepare("DELETE FROM comment_votes WHERE user_id = ? AND comment_id = ?")
      .bind(userId, commentId)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO comment_votes (user_id, comment_id, value) VALUES (?, ?, ?)
         ON CONFLICT(user_id, comment_id) DO UPDATE SET value = excluded.value`
      )
      .bind(userId, commentId, value)
      .run();
  }

  const row = await db
    .prepare(
      "SELECT COALESCE(SUM(value), 0) AS score FROM comment_votes WHERE comment_id = ?"
    )
    .bind(commentId)
    .first<{ score: number }>();
  return { score: row?.score ?? 0, userVote: value };
}

/** Look up the app_slug for a comment so we can scope rate limits and ownership. */
export async function getCommentSlug(
  db: D1Database,
  commentId: number
): Promise<string | null> {
  const row = await db
    .prepare("SELECT app_slug FROM comments WHERE id = ?")
    .bind(commentId)
    .first<{ app_slug: string }>();
  return row?.app_slug ?? null;
}

/**
 * Look up a candidate parent comment so the API can validate it before
 * accepting a reply. Returns null when the comment doesn't exist.
 */
export async function getCommentParentInfo(
  db: D1Database,
  commentId: number
): Promise<{ appSlug: string; parentId: number | null } | null> {
  const row = await db
    .prepare("SELECT app_slug, parent_id FROM comments WHERE id = ?")
    .bind(commentId)
    .first<{ app_slug: string; parent_id: number | null }>();
  if (!row) return null;
  return { appSlug: row.app_slug, parentId: row.parent_id };
}

export async function addComment(
  db: D1Database,
  userId: string,
  userName: string,
  userAvatar: string | null,
  slug: string,
  text: string,
  parentId: number | null = null
) {
  await db
    .prepare(
      "INSERT INTO comments (user_id, user_name, user_avatar, app_slug, text, parent_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(userId, userName, userAvatar, slug, text, parentId)
    .run();
}

// Submissions — records who submitted each app, for ownership checks on delete.
export async function recordSubmission(
  db: D1Database,
  slug: string,
  userId: string,
  userName: string
) {
  await db
    .prepare(
      `INSERT INTO submissions (app_slug, user_id, user_name) VALUES (?, ?, ?)
       ON CONFLICT(app_slug) DO NOTHING`
    )
    .bind(slug, userId, userName)
    .run();
}

export async function getSubmitter(db: D1Database, slug: string): Promise<string | null> {
  const result = await db
    .prepare("SELECT user_id FROM submissions WHERE app_slug = ?")
    .bind(slug)
    .first<{ user_id: string }>();
  return result?.user_id ?? null;
}

// App deletions — this is a *transient* UI-hide flag that bridges the ~90s gap
// between the delete PR merging and the Cloudflare redeploy. The source of truth
// is the repo itself — once the file is gone from main and deployed, this row
// becomes redundant (harmless).
export async function markAppDeleted(
  db: D1Database,
  slug: string,
  deletedBy: string,
  reason?: string
) {
  await db
    .prepare(
      `INSERT INTO app_deletions (app_slug, deleted_by, reason) VALUES (?, ?, ?)
       ON CONFLICT(app_slug) DO NOTHING`
    )
    .bind(slug, deletedBy, reason ?? null)
    .run();
}

export async function getDeletedSlugs(db: D1Database): Promise<Set<string>> {
  const result = await db
    .prepare("SELECT app_slug FROM app_deletions")
    .all<{ app_slug: string }>();
  return new Set(result.results.map((r) => r.app_slug));
}

export async function isAppDeleted(db: D1Database, slug: string): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM app_deletions WHERE app_slug = ?")
    .bind(slug)
    .first();
  return !!result;
}

export async function unmarkAppDeleted(db: D1Database, slug: string) {
  await db
    .prepare("DELETE FROM app_deletions WHERE app_slug = ?")
    .bind(slug)
    .run();
}

// Activity feed — union of recent likes, comments, and submissions
// across all users. Used by the right-side rail on wide screens to give
// the site a "people are here" feel.
export type ActivityType = "like" | "comment" | "submission";

export interface ActivityEvent {
  type: ActivityType;
  appSlug: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  userHandle: string | null;
  ts: string;
}

interface ActivityRow {
  type: string;
  app_slug: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  user_handle: string | null;
  ts: string;
}

export async function getRecentActivity(
  db: D1Database,
  limit = 15
): Promise<ActivityEvent[]> {
  const result = await db
    .prepare(
      `SELECT 'like' AS type, l.app_slug, l.user_id,
              u.name AS user_name, u.avatar AS user_avatar, u.handle AS user_handle,
              l.created_at AS ts
       FROM likes l LEFT JOIN users u ON u.id = l.user_id
       WHERE l.created_at > datetime('now', '-30 days')
       UNION ALL
       SELECT 'comment' AS type, c.app_slug, c.user_id,
              c.user_name, c.user_avatar, u.handle AS user_handle,
              c.created_at AS ts
       FROM comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.created_at > datetime('now', '-30 days')
       UNION ALL
       SELECT 'submission' AS type, s.app_slug, s.user_id,
              s.user_name, u.avatar AS user_avatar, u.handle AS user_handle,
              s.submitted_at AS ts
       FROM submissions s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.submitted_at > datetime('now', '-30 days')
       ORDER BY ts DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<ActivityRow>();

  return result.results.map((r) => ({
    type: r.type as ActivityType,
    appSlug: r.app_slug,
    userId: r.user_id,
    userName: r.user_name,
    userAvatar: r.user_avatar,
    userHandle: r.user_handle,
    ts: r.ts,
  }));
}
