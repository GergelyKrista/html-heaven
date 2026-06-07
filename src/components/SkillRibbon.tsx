"use client";

import { useState } from "react";

// The human→agent handoff for skill-flagged apps: the direct raw-HTML URL
// (what an LLM should fetch — the content, not the site chrome around it)
// with a copy button and a ready-to-paste usage line.
// See docs/html-skills-design.md §5.

export function SkillRibbon({ slug }: { slug: string }) {
  const url = `https://htmlheaven.com/apps/${slug}/index.html`;
  const usage = `Read ${url} and use it as a reference for this task.`;
  const [copied, setCopied] = useState<"url" | "usage" | null>(null);

  async function copy(text: string, which: "url" | "usage") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable (http, permissions) — non-fatal
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[13px]">⚡</span>
        <h2 className="text-[13px] font-semibold text-foreground">
          Also an LLM skill
        </h2>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-muted-light">
        This page is reviewed content an AI agent can use directly — point it
        at the raw URL.
      </p>

      <div className="mb-2 flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 py-1.5 text-[11px] text-muted-light">
          {url}
        </code>
        <button
          onClick={() => copy(url, "url")}
          className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
        >
          {copied === "url" ? "Copied!" : "Copy URL"}
        </button>
      </div>

      <button
        onClick={() => copy(usage, "usage")}
        className="text-[11px] text-muted transition-colors hover:text-foreground"
        title={usage}
      >
        {copied === "usage" ? "Copied!" : "Copy a ready-to-paste prompt →"}
      </button>
    </div>
  );
}
