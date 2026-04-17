"use client";

import { useState } from "react";

const PROMPT = `Create a self-contained HTML5 app that runs entirely in a single .html file. Requirements:

1. ONE FILE ONLY — all CSS, JavaScript, and assets inline. No external scripts or stylesheets.
2. NO EXTERNAL RESOURCES — no CDN links, no Google Fonts, no API calls. The app must work fully offline.
3. SANDBOX-SAFE — no cookies, localStorage keys that namespace your app (e.g. prefix with your app name), no popups.
4. SELF-CONTAINED UI — renders correctly at any viewport size from 320px wide up.
5. POLISHED — dark theme preferred, smooth animations, accessible buttons, keyboard support where relevant.
6. NO TRACKING — no analytics, no third-party scripts.

The app should be: [DESCRIBE YOUR APP HERE]

Return only the complete HTML file, starting with <!DOCTYPE html>.`;

export function AIGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(PROMPT).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-lg border border-border/60 bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <p className="text-[13px] font-semibold">Don&apos;t have an app yet?</p>
            <p className="text-[11px] text-muted">Use AI to create one in minutes</p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 text-[13px] text-muted-light">
          <ol className="space-y-3 pl-4" style={{ listStyle: "decimal" }}>
            <li>
              <strong className="text-foreground">Pick an AI chat:</strong> try{" "}
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light hover:underline"
              >
                Claude
              </a>
              ,{" "}
              <a
                href="https://chat.openai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light hover:underline"
              >
                ChatGPT
              </a>
              , or{" "}
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light hover:underline"
              >
                Gemini
              </a>
              .
            </li>
            <li>
              <strong className="text-foreground">Use this prompt</strong> (copy below) and replace{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-primary-light">
                [DESCRIBE YOUR APP HERE]
              </code>{" "}
              with what you want — e.g. &ldquo;a pomodoro timer with ambient sounds&rdquo;.
            </li>
            <li>
              <strong className="text-foreground">Save the response</strong> as{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-primary-light">
                my-app.html
              </code>
              .
            </li>
            <li>
              <strong className="text-foreground">Test it</strong> by opening it in your browser. Make
              sure it looks right and does what you expect.
            </li>
            <li>
              <strong className="text-foreground">Drag & drop it below</strong> to submit. Done.
            </li>
          </ol>

          <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-background">
            <div className="flex items-center justify-between border-b border-border/60 bg-surface-2 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Copy this prompt
              </span>
              <button
                onClick={copyPrompt}
                className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto px-3 py-2.5 text-[11px] leading-relaxed text-muted-light whitespace-pre-wrap">
              {PROMPT}
            </pre>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-background px-3 py-2.5">
            <p className="text-[12px] font-semibold text-foreground">
              💡 Tip: ideas that work well
            </p>
            <ul className="mt-1.5 space-y-0.5 pl-4 text-[12px]" style={{ listStyle: "disc" }}>
              <li>Single-purpose tools (unit converter, color picker, BPM tapper)</li>
              <li>Mini games (snake, 2048, memory match)</li>
              <li>Creative toys (particle systems, generative art, drawing pads)</li>
              <li>Calculators and visualizers</li>
              <li>Interactive demos of algorithms or physics</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
