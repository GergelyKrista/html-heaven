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
  created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE INDEX IF NOT EXISTS idx_favorites_slug ON favorites(app_slug);
CREATE INDEX IF NOT EXISTS idx_likes_slug ON likes(app_slug);
CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(app_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
