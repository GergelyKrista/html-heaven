import type { AppMeta } from "@/types";

// Import manifest statically — works on both Node.js and Cloudflare Workers.
// The generate-manifest script creates this file at build time.
import manifest from "@/generated/manifest.json";
import { getDB, getDeletedSlugs } from "./db";

const apps: AppMeta[] = manifest as AppMeta[];

/**
 * Returns the set of deleted-but-not-yet-purged slugs from D1.
 * Swallows errors and returns an empty set — better to show an app we
 * can't confirm is deleted than to break the whole page.
 */
async function deletedSet(): Promise<Set<string>> {
  try {
    const db = await getDB();
    return await getDeletedSlugs(db);
  } catch {
    return new Set();
  }
}

export async function getAllApps(): Promise<AppMeta[]> {
  const deleted = await deletedSet();
  return apps.filter((app) => !deleted.has(app.slug));
}

export async function getAppBySlug(slug: string): Promise<AppMeta | undefined> {
  const deleted = await deletedSet();
  if (deleted.has(slug)) return undefined;
  return apps.find((app) => app.slug === slug);
}

export async function getFeaturedApps(): Promise<AppMeta[]> {
  const deleted = await deletedSet();
  return apps.filter((app) => app.featured && !deleted.has(app.slug));
}

/**
 * Returns the most-liked apps with their like counts, sorted descending.
 * Ties broken by recency. Apps that have never been liked are excluded.
 * If D1 is unreachable, returns an empty array so the caller can skip
 * the section entirely rather than rendering an empty "Top" block.
 */
export async function getTopApps(count = 6): Promise<Array<AppMeta & { likeCount: number }>> {
  try {
    const db = await getDB();
    const [deleted, result] = await Promise.all([
      getDeletedSlugs(db),
      db
        .prepare("SELECT app_slug, COUNT(*) as likes FROM likes GROUP BY app_slug ORDER BY likes DESC")
        .all<{ app_slug: string; likes: number }>(),
    ]);
    const out: Array<AppMeta & { likeCount: number }> = [];
    for (const row of result.results) {
      if (deleted.has(row.app_slug)) continue;
      const app = apps.find((a) => a.slug === row.app_slug);
      if (!app) continue;
      out.push({ ...app, likeCount: row.likes });
      if (out.length >= count) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function getRecentApps(count = 6): Promise<AppMeta[]> {
  const deleted = await deletedSet();
  return apps
    .filter((app) => !deleted.has(app.slug))
    .slice()
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, count);
}

export async function getAllTags(): Promise<string[]> {
  const visible = await getAllApps();
  const tagSet = new Set<string>();
  for (const app of visible) {
    for (const tag of app.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}

/**
 * Synchronous version that does NOT filter deleted slugs.
 * Use ONLY for static generation of build-time paths — the dynamic
 * runtime filter still applies at request time.
 */
export function getAllAppsSync(): AppMeta[] {
  return apps;
}
