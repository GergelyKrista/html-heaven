// Distributed per-user rate limiting backed by D1.
//
// An in-memory Map won't work on Cloudflare Workers — each isolate is
// stateless and instances spin up/down on demand, so a Map reset after
// every cold start. This helper uses a `rate_limits` table so counts
// persist and are shared across every Worker instance.

export interface RateLimitResult {
  allowed: boolean;
  /** How many hits remain in the window after this call. 0 when blocked. */
  remaining: number;
}

/**
 * Check whether `userId` is under the limit for `action`, and if so,
 * record a new hit. Returns `{ allowed, remaining }` — callers should
 * early-return with 429 when `allowed` is false.
 *
 * Uses SQLite's `datetime('now', '-N seconds')` rolling-window arithmetic
 * based on the database clock, so the limit is consistent regardless of
 * which edge PoP the request landed on.
 *
 * The delete statement at the top is opportunistic garbage collection —
 * amortises the cost of keeping the table small across normal traffic,
 * no cron needed.
 */
export async function checkAndRecord(
  db: D1Database,
  userId: string,
  action: string,
  windowSeconds: number,
  limit: number
): Promise<RateLimitResult> {
  const windowMod = `-${windowSeconds} seconds`;
  const gcMod = `-${windowSeconds * 4} seconds`;

  // GC rows well outside the window — keeps the table bounded
  await db
    .prepare(
      "DELETE FROM rate_limits WHERE user_id = ? AND action = ? AND ts < datetime('now', ?)"
    )
    .bind(userId, action, gcMod)
    .run();

  const row = await db
    .prepare(
      "SELECT COUNT(*) as c FROM rate_limits WHERE user_id = ? AND action = ? AND ts > datetime('now', ?)"
    )
    .bind(userId, action, windowMod)
    .first<{ c: number }>();

  const used = row?.c ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await db
    .prepare("INSERT INTO rate_limits (user_id, action) VALUES (?, ?)")
    .bind(userId, action)
    .run();

  return { allowed: true, remaining: limit - used - 1 };
}
