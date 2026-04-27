"use client";

import { useState } from "react";
import type { AppMeta } from "@/types";
import { isExternal } from "@/types";

interface Props {
  app: AppMeta;
}

export function AppPlayer({ app }: Props) {
  const external = isExternal(app);
  if (external) {
    return <ExternalLauncher app={app} />;
  }
  return <BundledPlayer slug={app.slug} title={app.title} />;
}

function BundledPlayer({ slug, title }: { slug: string; title: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const src = `/apps/${slug}/index.html`;

  return (
    <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
      <div className={`flex items-center justify-between border border-border/60 bg-surface-2 px-3 py-1.5 ${isFullscreen ? "" : "rounded-t-lg"}`}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-light" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-light" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-light" />
          </div>
          <span className="ml-1 text-[12px] text-muted">{title}</span>
        </div>
        <div className="flex gap-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
          >
            New tab
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
          >
            {isFullscreen ? "Exit" : "Expand"}
          </button>
        </div>
      </div>

      <iframe
        src={src}
        title={title}
        sandbox="allow-scripts"
        className={`w-full border border-t-0 border-border/60 bg-white ${
          isFullscreen
            ? "h-[calc(100vh-37px)]"
            : "h-[480px] rounded-b-lg sm:h-[580px]"
        }`}
      />

      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute right-3 top-12 rounded bg-black/60 px-2 py-1 text-[11px] text-white/80 backdrop-blur-sm transition-colors hover:text-white"
        >
          ESC to exit
        </button>
      )}
    </div>
  );
}

// External apps aren't iframed — most sites block framing with X-Frame-Options
// or CSP frame-ancestors, and iframing third-party content we don't control
// is a security risk anyway. Show a dedicated launcher card instead.
function ExternalLauncher({ app }: { app: AppMeta }) {
  const url = app.externalUrl ?? "#";
  let host = "external site";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // leave default
  }

  return (
    <div className="rounded-lg border border-border/60 bg-surface p-6 sm:p-10">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-2xl">
          🔗
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          External app
        </p>
        <h2 className="mb-2 text-[17px] font-semibold text-foreground">
          Hosted on {host}
        </h2>
        <p className="mb-5 max-w-md text-[13px] leading-relaxed text-muted-light">
          This app lives on the submitter&apos;s own domain. We don&apos;t
          embed third-party sites — the launch opens in a new tab.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Open on {host}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
        <p className="mt-4 break-all text-[11px] text-muted/70">{url}</p>
      </div>
    </div>
  );
}
