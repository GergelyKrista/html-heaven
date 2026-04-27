#!/usr/bin/env node
/**
 * Headless-render every bundled app and save a thumbnail.png next to its
 * app.json. Skips apps that already have one, and skips externally-hosted
 * apps (those don't live on our origin).
 *
 * Run AFTER generate-manifest has populated public/apps/<slug>/ and AFTER
 * `npm run dev` is serving on localhost:3000.
 *
 * Usage:
 *   node scripts/take-thumbnails.mjs           # only apps without a thumbnail
 *   node scripts/take-thumbnails.mjs --force   # re-shoot everything
 *   node scripts/take-thumbnails.mjs <slug>... # specific slugs only
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const APPS_DIR = join(ROOT, "apps");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const args = process.argv.slice(2);
const force = args.includes("--force");
const explicitSlugs = args.filter((a) => !a.startsWith("--"));

// 16:9 — matches the card's aspect-[16/9]. 2× a typical card width on
// desktop (340px) gives 680, but PNG compresses well so we go higher
// for crispness on retina displays.
const VIEWPORT = { width: 1280, height: 720 };

function shouldShoot(slug) {
  if (explicitSlugs.length && !explicitSlugs.includes(slug)) return false;
  const appJsonPath = join(APPS_DIR, slug, "app.json");
  if (!existsSync(appJsonPath)) return false;
  let meta;
  try {
    meta = JSON.parse(readFileSync(appJsonPath, "utf-8"));
  } catch {
    console.warn(`  ${slug}: invalid app.json — skipping`);
    return false;
  }
  if (meta.hostingType === "external") {
    console.log(`  ${slug}: external — skipping (no local file to render)`);
    return false;
  }
  const indexPath = join(APPS_DIR, slug, "index.html");
  if (!existsSync(indexPath)) {
    console.warn(`  ${slug}: no index.html — skipping`);
    return false;
  }
  const thumbPath = join(APPS_DIR, slug, "thumbnail.png");
  if (!force && existsSync(thumbPath)) {
    console.log(`  ${slug}: thumbnail.png already exists — skipping (pass --force to re-shoot)`);
    return false;
  }
  return true;
}

async function main() {
  const allSlugs = readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const targets = allSlugs.filter(shouldShoot);

  if (!targets.length) {
    console.log("Nothing to shoot.");
    return;
  }

  console.log(`Shooting ${targets.length} app${targets.length === 1 ? "" : "s"} via ${BASE_URL}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    // Our middleware force-redirects http→https whenever it sees this
    // header set to "http". Next dev seems to inject it; lying about it
    // here is the cheapest way to bypass the redirect during screenshots.
    extraHTTPHeaders: {
      "x-forwarded-proto": "https",
    },
  });

  let success = 0;
  let failed = 0;

  for (const slug of targets) {
    const page = await context.newPage();
    const url = `${BASE_URL}/apps/${slug}/index.html`;
    const out = join(APPS_DIR, slug, "thumbnail.png");

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      // Hide our injected back badge so it doesn't appear in every shot.
      await page.addStyleTag({
        content: `#__hh-back-badge{display:none!important}`,
      });
      // Some apps animate in or fetch fonts after load — give them a
      // moment to settle.
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: out,
        type: "png",
        fullPage: false,
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });
      console.log(`  ✓ ${slug}`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err instanceof Error ? err.message : err}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`Done — ${success} shot, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
