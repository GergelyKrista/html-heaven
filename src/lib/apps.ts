import fs from "fs";
import path from "path";
import type { AppMeta } from "@/types";

function loadManifest(): AppMeta[] {
  const manifestPath = path.join(process.cwd(), "manifest.json");
  const data = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(data);
}

const apps: AppMeta[] = loadManifest();

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
