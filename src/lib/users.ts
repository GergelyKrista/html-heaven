import { getDB } from "./db";

export interface UserProfile {
  id: string;                 // email
  name: string;
  avatar: string | null;
  handle: string | null;      // public URL handle, e.g. "gergely"
  bio: string | null;
  website: string | null;
  github: string | null;      // github username
  xHandle: string | null;     // x/twitter handle
  redditHandle: string | null; // reddit username (without "u/")
  location: string | null;
  createdAt: string;
}

export interface ProfileStats {
  appsSubmitted: number;
  likesReceived: number;      // total likes across all their apps
  followers: number;
  following: number;
}

/**
 * Normalize a handle to the canonical form.
 * "Gergely Krista!" → "gergely-krista"; returns null if nothing valid remains.
 * Handles are 3-25 chars, lowercase alphanumeric with hyphens.
 */
export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (n.length < 3 || n.length > 25) return null;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n)) return null;
  return n;
}

export interface GithubProfileFields {
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  twitter?: string | null;
}

/**
 * Ensures a user row exists with everything we can pull from GitHub.
 * - name / avatar are always refreshed from the latest session.
 * - handle is auto-claimed from the GitHub login if still null.
 * - bio / website / location / x_handle are only set if they're still NULL
 *   in the DB — we never overwrite what the user edited themselves.
 *
 * Called by auth-gated API routes after session is verified.
 */
export async function ensureUserWithHandle(
  db: D1Database,
  id: string,
  name: string,
  avatar: string | null,
  githubLogin: string | null,
  gh: GithubProfileFields = {}
) {
  // Upsert basic identity fields
  await db
    .prepare(
      `INSERT INTO users (id, name, avatar, github) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar,
         github = COALESCE(users.github, excluded.github)`
    )
    .bind(id, name, avatar, githubLogin)
    .run();

  // Fetch current row so we only fill fields that are still empty.
  const existing = await db
    .prepare(
      `SELECT handle, bio, website, x_handle, location FROM users WHERE id = ?`
    )
    .bind(id)
    .first<{
      handle: string | null;
      bio: string | null;
      website: string | null;
      x_handle: string | null;
      location: string | null;
    }>();

  // Auto-claim a handle from the GitHub login if we don't have one yet.
  if (!existing?.handle && githubLogin) {
    const base = normalizeHandle(githubLogin);
    if (base) {
      // Try base, then base-2, base-3... up to base-9
      for (const candidate of [base, ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 2}`)]) {
        const taken = await db
          .prepare("SELECT 1 FROM users WHERE handle = ? AND id != ?")
          .bind(candidate, id)
          .first();
        if (!taken) {
          await db
            .prepare("UPDATE users SET handle = ? WHERE id = ? AND handle IS NULL")
            .bind(candidate, id)
            .run();
          break;
        }
      }
    }
  }

  // Fill profile fields from GitHub — only if still empty.
  // This means first-time sign-in pre-populates the profile, but if the
  // user later edits their bio on the site we never clobber it.
  const fillUpdates: Array<[string, string | null]> = [];
  if (existing?.bio == null && gh.bio) fillUpdates.push(["bio", gh.bio]);
  if (existing?.website == null && gh.website) {
    const url = /^https?:\/\//i.test(gh.website) ? gh.website : `https://${gh.website}`;
    fillUpdates.push(["website", url]);
  }
  if (existing?.location == null && gh.location) fillUpdates.push(["location", gh.location]);
  if (existing?.x_handle == null && gh.twitter) fillUpdates.push(["x_handle", gh.twitter]);

  if (fillUpdates.length > 0) {
    const setClause = fillUpdates.map(([col]) => `${col} = ?`).join(", ");
    const values = fillUpdates.map(([, val]) => val);
    await db
      .prepare(`UPDATE users SET ${setClause} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }
}

type ProfileRow = {
  id: string;
  name: string;
  avatar: string | null;
  handle: string | null;
  bio: string | null;
  website: string | null;
  github: string | null;
  x_handle: string | null;
  reddit_handle: string | null;
  location: string | null;
  created_at: string;
};

const PROFILE_COLS =
  "id, name, avatar, handle, bio, website, github, x_handle, reddit_handle, location, created_at";

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    handle: row.handle,
    bio: row.bio,
    website: row.website,
    github: row.github,
    xHandle: row.x_handle,
    redditHandle: row.reddit_handle,
    location: row.location,
    createdAt: row.created_at,
  };
}

export async function getProfileByHandle(db: D1Database, handle: string): Promise<UserProfile | null> {
  const row = await db
    .prepare(`SELECT ${PROFILE_COLS} FROM users WHERE handle = ?`)
    .bind(handle)
    .first<ProfileRow>();
  return row ? rowToProfile(row) : null;
}

export async function getProfileById(db: D1Database, id: string): Promise<UserProfile | null> {
  const row = await db
    .prepare(`SELECT ${PROFILE_COLS} FROM users WHERE id = ?`)
    .bind(id)
    .first<ProfileRow>();
  return row ? rowToProfile(row) : null;
}

export async function updateProfile(
  db: D1Database,
  userId: string,
  updates: {
    handle?: string | null;
    bio?: string | null;
    website?: string | null;
    github?: string | null;
    xHandle?: string | null;
    redditHandle?: string | null;
    location?: string | null;
  }
) {
  // Validate handle uniqueness if provided
  if (updates.handle !== undefined) {
    if (updates.handle) {
      const clash = await db
        .prepare("SELECT 1 FROM users WHERE handle = ? AND id != ?")
        .bind(updates.handle, userId)
        .first();
      if (clash) throw new Error("That handle is already taken.");
    }
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const mappings: Array<[string, string]> = [
    ["handle", "handle"],
    ["bio", "bio"],
    ["website", "website"],
    ["github", "github"],
    ["xHandle", "x_handle"],
    ["redditHandle", "reddit_handle"],
    ["location", "location"],
  ];
  for (const [key, col] of mappings) {
    if (updates[key as keyof typeof updates] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(updates[key as keyof typeof updates]);
    }
  }
  if (!fields.length) return;
  values.push(userId);
  await db
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function getProfileStats(db: D1Database, userId: string): Promise<ProfileStats> {
  const [appsRow, likesRow, followersRow, followingRow] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ?")
      .bind(userId)
      .first<{ count: number }>(),
    // Likes received = count of rows in `likes` whose app_slug is one the user submitted
    db
      .prepare(
        `SELECT COUNT(*) as count FROM likes
         WHERE app_slug IN (SELECT app_slug FROM submissions WHERE user_id = ?)`
      )
      .bind(userId)
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ?")
      .bind(userId)
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?")
      .bind(userId)
      .first<{ count: number }>(),
  ]);
  return {
    appsSubmitted: appsRow?.count ?? 0,
    likesReceived: likesRow?.count ?? 0,
    followers: followersRow?.count ?? 0,
    following: followingRow?.count ?? 0,
  };
}

export async function getUserAppSlugs(db: D1Database, userId: string): Promise<string[]> {
  const result = await db
    .prepare("SELECT app_slug FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC")
    .bind(userId)
    .all<{ app_slug: string }>();
  return result.results.map((r) => r.app_slug);
}

// ────────────────────────────────────────────────────────────
// Follow graph
// ────────────────────────────────────────────────────────────

export async function follow(db: D1Database, follower: string, following: string) {
  if (follower === following) throw new Error("Cannot follow yourself.");
  await db
    .prepare(
      `INSERT INTO follows (follower_id, following_id) VALUES (?, ?)
       ON CONFLICT(follower_id, following_id) DO NOTHING`
    )
    .bind(follower, following)
    .run();
}

export async function unfollow(db: D1Database, follower: string, following: string) {
  await db
    .prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?")
    .bind(follower, following)
    .run();
}

export async function isFollowing(db: D1Database, follower: string, following: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .bind(follower, following)
    .first();
  return !!row;
}
