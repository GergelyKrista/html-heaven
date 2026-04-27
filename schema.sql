CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  github_username TEXT,
  handle TEXT,
  bio TEXT,
  website TEXT,
  github TEXT,
  x_handle TEXT,
  reddit_handle TEXT,
  location TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users(handle) WHERE handle IS NOT NULL;

-- Social follow graph
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, app_slug)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, app_slug)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  app_slug TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  -- Threading: NULL for a top-level comment, otherwise the id of the
  -- top-level comment this is a reply to. Threads only nest one level
  -- deep — replying to a reply is rejected at the API layer so this
  -- column never points at another reply.
  parent_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- Up/down votes on individual comments. One vote per user per comment;
-- value is +1 (upvote) or -1 (downvote). Deleting the row clears the
-- user's vote (rather than storing a 0).
CREATE TABLE IF NOT EXISTS comment_votes (
  user_id TEXT NOT NULL,
  comment_id INTEGER NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);

-- Tracks who submitted which app — used for ownership checks on delete
CREATE TABLE IF NOT EXISTS submissions (
  app_slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  submitted_at TEXT DEFAULT (datetime('now'))
);

-- Soft-delete flag. Presence of a row here = app is hidden from the UI.
-- Files may still exist in the repo; run the purge script to hard-delete.
CREATE TABLE IF NOT EXISTS app_deletions (
  app_slug TEXT PRIMARY KEY,
  deleted_by TEXT NOT NULL,
  deleted_at TEXT DEFAULT (datetime('now')),
  reason TEXT
);

-- Per-user rate limit ledger. One row per allowed hit. Callers check the
-- rolling-window count before inserting a new row.
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(user_id, action, ts);

CREATE INDEX IF NOT EXISTS idx_favorites_slug ON favorites(app_slug);
CREATE INDEX IF NOT EXISTS idx_likes_slug ON likes(app_slug);
CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(app_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
