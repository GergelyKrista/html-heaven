import * as fs from "fs";
import * as path from "path";

interface AppMeta {
  title: string;
  slug: string;
  description: string;
  author: string;
  tags: string[];
  dateAdded: string;
  thumbnail: string;
  featured: boolean;
}

const appsDir = path.join(__dirname, "..", "apps");
const publicAppsDir = path.join(__dirname, "..", "public", "apps");
const manifestPath = path.join(__dirname, "..", "manifest.json");

// Ensure public/apps directory exists
if (!fs.existsSync(publicAppsDir)) {
  fs.mkdirSync(publicAppsDir, { recursive: true });
}

const entries = fs.readdirSync(appsDir, { withFileTypes: true });
const apps: AppMeta[] = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const appJsonPath = path.join(appsDir, entry.name, "app.json");
  if (!fs.existsSync(appJsonPath)) {
    console.warn(`Skipping ${entry.name}: no app.json found`);
    continue;
  }

  const meta: AppMeta = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  apps.push(meta);

  // Copy app files to public/apps/{slug}/
  const destDir = path.join(publicAppsDir, meta.slug);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const appFiles = fs.readdirSync(path.join(appsDir, entry.name));
  for (const file of appFiles) {
    if (file === "app.json") continue;
    fs.copyFileSync(
      path.join(appsDir, entry.name, file),
      path.join(destDir, file)
    );
  }
}

// Sort by dateAdded descending
apps.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

fs.writeFileSync(manifestPath, JSON.stringify(apps, null, 2));
console.log(`Generated manifest.json with ${apps.length} apps`);
console.log(`Copied app files to public/apps/`);
