#!/usr/bin/env node
/**
 * Analyzes submitted HTML files for suspicious content.
 * Designed to run inside the review-submission.yml GitHub Action.
 *
 * Usage:
 *   node scripts/review-submission.mjs <file1.html> [file2.html ...]
 *
 * Outputs JSON to stdout:
 *   {
 *     "overall": "clean" | "suspicious" | "critical",
 *     "findings": [{ file, severity, category, message, snippet? }, ...]
 *   }
 *
 * Severity levels:
 *   - critical: almost certainly bad (secrets, cryptominers, known malicious)
 *   - warning:  probably fine but worth a human look
 *   - info:     FYI; doesn't block auto-approval
 */

import { readFileSync, statSync } from "node:fs";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB (matches submit-API limit)
const LARGE_FILE_WARN_BYTES = 800 * 1024; // 800 KB

// Patterns that indicate secrets/credentials committed by accident.
// Marked critical — PR should NOT auto-approve.
const SECRET_PATTERNS = [
  { re: /sk-[a-zA-Z0-9-_]{20,}/g,         label: "OpenAI-style API key (sk-...)" },
  { re: /sk-ant-[a-zA-Z0-9-_]{20,}/g,     label: "Anthropic API key (sk-ant-...)" },
  { re: /ghp_[A-Za-z0-9]{30,}/g,          label: "GitHub Personal Access Token (ghp_...)" },
  { re: /gho_[A-Za-z0-9]{30,}/g,          label: "GitHub OAuth token (gho_...)" },
  { re: /ghs_[A-Za-z0-9]{30,}/g,          label: "GitHub server token (ghs_...)" },
  { re: /github_pat_[A-Za-z0-9_]{40,}/g,  label: "GitHub fine-grained PAT" },
  { re: /AKIA[0-9A-Z]{16}/g,              label: "AWS Access Key ID" },
  { re: /AIza[0-9A-Za-z\-_]{35}/g,        label: "Google API key" },
  { re: /xox[aboprs]-[0-9a-zA-Z-]{10,}/g, label: "Slack token" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, label: "Private key block" },
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: "JWT token" },
  { re: /cfut_[A-Za-z0-9]{30,}/g,         label: "Cloudflare API token" },
];

// Known tracker / analytics scripts. Not inherently "bad" but not aligned with
// the "no external resources" guideline.
const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "analytics.google.com",
  "facebook.net",
  "connect.facebook.net",
  "segment.com",
  "cdn.segment.com",
  "mixpanel.com",
  "hotjar.com",
  "fullstory.com",
  "mouseflow.com",
  "posthog.com",
  "logrocket.com",
  "amplitude.com",
  "datadoghq.com",
  "sentry-cdn.com",
  "plausible.io",
  "umami",
];

// Known cryptominer scripts / domains.
const MINER_PATTERNS = [
  /coinhive\.com/i,
  /coin-?hive/i,
  /crypto-?loot/i,
  /webminepool/i,
  /cryptonoter/i,
  /authedmine/i,
  /minecrunch/i,
  /deepMiner/i,
];

// Accept these origins for scripts/styles without warning — public CDNs,
// commonly used and generally safe.
const SAFE_CDN_HOSTS = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "esm.sh",
  "code.jquery.com",
];

function getHostname(urlStr) {
  try {
    // Tolerate protocol-relative URLs
    const u = new URL(urlStr.startsWith("//") ? `https:${urlStr}` : urlStr);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function trim(s, n = 120) {
  return s.length > n ? s.slice(0, n) + "..." : s;
}

function reviewFile(filePath) {
  const findings = [];
  let content;
  let size;
  try {
    size = statSync(filePath).size;
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    findings.push({
      file: filePath,
      severity: "warning",
      category: "read-error",
      message: `Could not read file: ${err.message}`,
    });
    return findings;
  }

  // --- Size checks ---
  if (size > MAX_FILE_BYTES) {
    findings.push({
      file: filePath,
      severity: "critical",
      category: "file-size",
      message: `File is ${(size / 1024).toFixed(0)} KB — exceeds the 2 MB limit.`,
    });
  } else if (size > LARGE_FILE_WARN_BYTES) {
    findings.push({
      file: filePath,
      severity: "warning",
      category: "file-size",
      message: `File is ${(size / 1024).toFixed(0)} KB — worth checking it's reasonable.`,
    });
  }

  // --- Secrets ---
  for (const { re, label } of SECRET_PATTERNS) {
    const match = content.match(re);
    if (match && match.length > 0) {
      findings.push({
        file: filePath,
        severity: "critical",
        category: "possible-secret",
        message: `Found what looks like a ${label}. Do NOT merge until confirmed.`,
        // Don't include the actual match — would leak it into the PR comment
        snippet: `${match.length} occurrence${match.length === 1 ? "" : "s"}`,
      });
    }
  }

  // --- Cryptominers ---
  for (const re of MINER_PATTERNS) {
    if (re.test(content)) {
      findings.push({
        file: filePath,
        severity: "critical",
        category: "cryptominer",
        message: `Possible cryptomining reference matched: ${re}`,
      });
    }
  }

  // --- Obfuscation signals ---
  const evalCount = (content.match(/\beval\s*\(/g) || []).length;
  const fnCtorCount = (content.match(/new\s+Function\s*\(/g) || []).length;
  const atobCount = (content.match(/\batob\s*\(/g) || []).length;
  if (evalCount >= 3 || fnCtorCount >= 2 || atobCount >= 3) {
    findings.push({
      file: filePath,
      severity: "warning",
      category: "obfuscation",
      message: `Heavy use of dynamic code execution (eval×${evalCount}, Function×${fnCtorCount}, atob×${atobCount}).`,
    });
  }

  // --- External scripts / iframes / links ---
  const scriptSrcRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
  const iframeSrcRe = /<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi;
  const linkHrefRe = /<link[^>]+href\s*=\s*["']([^"']+)["']/gi;
  const importFromRe = /\bimport\s+(?:[\w*{},\s]+\s+from\s+)?["']([^"']+)["']/g;

  for (const { re, tag } of [
    { re: scriptSrcRe, tag: "script" },
    { re: iframeSrcRe, tag: "iframe" },
    { re: linkHrefRe, tag: "link" },
    { re: importFromRe, tag: "import" },
  ]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const url = m[1];
      if (!url || url.startsWith("#")) continue;
      if (url.startsWith("data:")) continue; // inline data URLs are fine
      const isHttp = /^https?:\/\//i.test(url) || url.startsWith("//");
      if (!isHttp) continue; // relative/inline references fine

      const host = getHostname(url);
      if (!host) continue;

      // Check trackers first
      if (TRACKER_HOSTS.some((t) => host.includes(t))) {
        findings.push({
          file: filePath,
          severity: "warning",
          category: "tracker",
          message: `External tracker detected in <${tag}>: ${host}`,
          snippet: trim(m[0]),
        });
        continue;
      }

      // Check miners
      if (MINER_PATTERNS.some((re2) => re2.test(host) || re2.test(url))) {
        findings.push({
          file: filePath,
          severity: "critical",
          category: "cryptominer",
          message: `Cryptominer host in <${tag}>: ${host}`,
          snippet: trim(m[0]),
        });
        continue;
      }

      // Known safe CDNs → info level
      if (SAFE_CDN_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
        findings.push({
          file: filePath,
          severity: "info",
          category: "external-resource",
          message: `External resource from known CDN: ${host} (<${tag}>)`,
          snippet: trim(m[0]),
        });
        continue;
      }

      // Unknown external host → warning (user's guideline is self-contained)
      findings.push({
        file: filePath,
        severity: "warning",
        category: "external-resource",
        message: `External <${tag}> loads from unvetted host: ${host}`,
        snippet: trim(m[0]),
      });
    }
  }

  // --- fetch() / XHR to external origins ---
  const fetchRe = /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const xhrOpenRe = /\.open\s*\(\s*["'`][A-Z]+["'`]\s*,\s*["'`]([^"'`]+)["'`]/g;
  for (const { re, label } of [
    { re: fetchRe, label: "fetch()" },
    { re: xhrOpenRe, label: "XHR.open()" },
  ]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const url = m[1];
      if (!/^https?:\/\//i.test(url) && !url.startsWith("//")) continue;
      const host = getHostname(url);
      if (!host) continue;
      if (SAFE_CDN_HOSTS.some((h) => host === h || host.endsWith("." + h))) continue;
      findings.push({
        file: filePath,
        severity: "warning",
        category: "external-request",
        message: `${label} to external host: ${host}`,
        snippet: trim(m[0]),
      });
    }
  }

  // --- Forms posting to external URLs (phishing risk) ---
  const formRe = /<form[^>]+action\s*=\s*["']([^"']+)["']/gi;
  let fm;
  while ((fm = formRe.exec(content)) !== null) {
    const action = fm[1];
    if (!/^https?:/i.test(action) && !action.startsWith("//")) continue;
    const host = getHostname(action);
    if (!host) continue;
    findings.push({
      file: filePath,
      severity: "critical",
      category: "external-form-post",
      message: `<form> submits to external host: ${host} — phishing risk.`,
      snippet: trim(fm[0]),
    });
  }

  // --- window.location manipulation that happens on load (auto-redirect) ---
  if (/window\.location\s*=\s*["'`]https?:/i.test(content) ||
      /location\.href\s*=\s*["'`]https?:/i.test(content) ||
      /location\.replace\s*\(\s*["'`]https?:/i.test(content)) {
    findings.push({
      file: filePath,
      severity: "warning",
      category: "auto-redirect",
      message: "Code appears to set window.location to an external URL (possible auto-redirect).",
    });
  }

  // --- Hidden iframes (common phishing / clickjacking setup) ---
  if (/<iframe[^>]+(style\s*=\s*["'][^"']*display\s*:\s*none|width\s*=\s*["']?0|height\s*=\s*["']?0|hidden)/i.test(content)) {
    findings.push({
      file: filePath,
      severity: "warning",
      category: "hidden-iframe",
      message: "Found a hidden or zero-size iframe — could be legitimate or clickjacking.",
    });
  }

  return findings;
}

function severityRank(s) {
  return s === "critical" ? 2 : s === "warning" ? 1 : 0;
}

function main() {
  const files = process.argv.slice(2).filter((f) => f.endsWith(".html") || f.endsWith(".htm"));
  const allFindings = [];
  for (const f of files) {
    allFindings.push(...reviewFile(f));
  }

  let maxSeverity = 0;
  for (const f of allFindings) maxSeverity = Math.max(maxSeverity, severityRank(f.severity));
  const overall = maxSeverity >= 2 ? "critical" : maxSeverity === 1 ? "suspicious" : "clean";

  const report = {
    overall,
    filesReviewed: files,
    findings: allFindings,
  };
  process.stdout.write(JSON.stringify(report, null, 2));
}

main();
