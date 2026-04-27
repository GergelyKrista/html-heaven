import * as fs from "fs";
import * as path from "path";

type HostingType = "bundled" | "external";

interface AppMeta {
  title: string;
  slug: string;
  description: string;
  author: string;
  tags: string[];
  dateAdded: string;
  featured: boolean;
  hostingType?: HostingType;
  thumbnail?: string;
  externalUrl?: string;
}

const appsDir = path.join(__dirname, "..", "apps");
const publicAppsDir = path.join(__dirname, "..", "public", "apps");
const generatedDir = path.join(__dirname, "..", "src", "generated");
const manifestPath = path.join(generatedDir, "manifest.json");

// The "Back to HTML Heaven" badge injected into every bundled app.
// External apps aren't touched — they live on the submitter's own domain.
const BACK_BADGE = `
<!-- Injected by HTML Heaven -->
<div id="__hh-back-badge" style="all:initial;position:fixed;top:12px;left:12px;z-index:2147483647;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <a href="https://htmlheaven.com/" target="_top" rel="noopener"
     style="all:initial;display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;background:rgba(0,0,0,0.75);color:#fff;text-decoration:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1"
     onmouseover="this.style.background='rgba(0,0,0,0.9)'"
     onmouseout="this.style.background='rgba(0,0,0,0.75)'"
     title="Back to HTML Heaven">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><path d="M15 18l-6-6 6-6"/></svg>
    <span style="all:initial;color:inherit;font:inherit">HTML Heaven</span>
  </a>
</div>
<!-- /HTML Heaven -->
`.trim();

function injectBackBadge(html: string): string {
  if (html.includes("__hh-back-badge")) return html;
  const bodyCloseRegex = /<\/body\s*>/i;
  if (bodyCloseRegex.test(html)) {
    return html.replace(bodyCloseRegex, `${BACK_BADGE}\n</body>`);
  }
  return html + "\n" + BACK_BADGE;
}

// Validate one app.json entry. Throws with a helpful message on invalid
// combinations so the prebuild step fails fast instead of shipping a
// broken manifest.
function validate(meta: AppMeta, dir: string): void {
  if (!meta.slug || !meta.title || !meta.description) {
    throw new Error(`${dir}: app.json missing required fields (slug/title/description)`);
  }

  const type = meta.hostingType ?? "bundled";

  if (type === "external") {
    if (!meta.externalUrl) {
      throw new Error(`${dir}: hostingType="external" requires externalUrl`);
    }
    if (!/^https:\/\//i.test(meta.externalUrl)) {
      throw new Error(`${dir}: externalUrl must start with https://`);
    }
    try {
      new URL(meta.externalUrl);
    } catch {
      throw new Error(`${dir}: externalUrl is not a valid URL`);
    }
    return;
  }

  if (type !== "bundled") {
    throw new Error(`${dir}: unknown hostingType "${type}" (expected "bundled" or "external")`);
  }

  // Bundled — the folder must contain index.html
  const htmlPath = path.join(appsDir, dir, "index.html");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`${dir}: bundled app is missing index.html`);
  }
}

// Ensure output directories exist
if (!fs.existsSync(publicAppsDir)) {
  fs.mkdirSync(publicAppsDir, { recursive: true });
}
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
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
  validate(meta, entry.name);

  // Normalize the manifest entry so downstream consumers can rely on the
  // field being present.
  meta.hostingType = meta.hostingType ?? "bundled";
  apps.push(meta);

  // External apps don't need anything copied to public/ — they live on
  // the submitter's domain.
  if (meta.hostingType === "external") continue;

  // Bundled: copy every file under apps/<slug>/ (except app.json) into
  // public/apps/<slug>/, injecting the back badge into HTML.
  const destDir = path.join(publicAppsDir, meta.slug);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const appFiles = fs.readdirSync(path.join(appsDir, entry.name));
  for (const file of appFiles) {
    if (file === "app.json") continue;

    const srcPath = path.join(appsDir, entry.name, file);
    const destPath = path.join(destDir, file);

    if (file.endsWith(".html") || file.endsWith(".htm")) {
      const content = fs.readFileSync(srcPath, "utf-8");
      fs.writeFileSync(destPath, injectBackBadge(content));
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Sort by dateAdded descending
apps.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

fs.writeFileSync(manifestPath, JSON.stringify(apps, null, 2));
const externalCount = apps.filter((a) => a.hostingType === "external").length;
const bundledCount = apps.length - externalCount;
console.log(
  `Generated manifest.json with ${apps.length} apps (${bundledCount} bundled, ${externalCount} external)`
);
console.log(`Copied bundled app files to public/apps/ (with back badge injected)`);
