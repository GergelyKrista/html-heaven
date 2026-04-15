import type { AppMeta } from "@/types";

// Import manifest statically — works on both Node.js and Cloudflare Workers.
// The generate-manifest script creates this file at build time.
import manifest from "@/generated/manifest.json";

const apps: AppMeta[] = manifest as AppMeta[];

export function getAllApps(): AppMeta[] {
  return apps;
}

export function getAppBySlug(slug: string): AppMeta | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getFeaturedApps(): AppMeta[] {
  return apps.filter((app) => app.featured);
}

export function getRecentApps(count = 6): AppMeta[] {
  return [...apps]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, count);
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  for (const app of apps) {
    for (const tag of app.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}
