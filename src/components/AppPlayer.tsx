"use client";

import { useState } from "react";

export function AppPlayer({ slug, title }: { slug: string; title: string }) {
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
