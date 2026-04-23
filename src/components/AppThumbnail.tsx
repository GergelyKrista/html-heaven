"use client";

import { useState } from "react";
import type { AppMeta } from "@/types";

// Two-tone deep palettes picked by slug hash. Deliberately muted — the
// grid is dark and typographic, so covers should feel like part of the
// page, not a sticker book of rainbow gradients.
const GRADIENTS = [
  { from: "#1f2937", to: "#0f172a" }, // zinc / slate
  { from: "#1e3a8a", to: "#0f172a" }, // deep blue → slate
  { from: "#1e1b4b", to: "#0a0818" }, // indigo-black
  { from: "#0f4c3a", to: "#052e2a" }, // deep forest
  { from: "#581c87", to: "#2e1065" }, // aubergine
  { from: "#7c2d12", to: "#431407" }, // rust
  { from: "#0c4a6e", to: "#082f49" }, // deep ocean
  { from: "#3f3f46", to: "#18181b" }, // graphite
  { from: "#4c1d95", to: "#1e1b4b" }, // violet → indigo
  { from: "#134e4a", to: "#042f2a" }, // deep teal
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = slug.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

// Take the first visible character of the title. Falls back to the slug
// if the title is empty for some reason, and to "?" if both are empty.
function monogram(app: AppMeta): string {
  const src = (app.title || app.slug || "?").trim();
  // Grab the first grapheme that isn't whitespace or a common emoji/zw joiner.
  // Intl.Segmenter handles multi-codepoint clusters correctly.
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const s of seg.segment(src)) {
      const ch = s.segment;
      if (/\S/.test(ch)) return ch.toUpperCase();
    }
  }
  return (src[0] ?? "?").toUpperCase();
}

export function AppThumbnail({
  app,
  /** aspect ratio passed as a Tailwind class string, e.g. "aspect-[16/9]" */
  aspect = "aspect-[16/9]",
}: {
  app: AppMeta;
  aspect?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const grad = GRADIENTS[hashSlug(app.slug) % GRADIENTS.length];
  const letter = monogram(app);

  // Only attempt an image if the app.json has a non-default thumbnail value.
  // We try to load it and fall back to procedural on error — bundled apps
  // that ship a real thumbnail.png still get to show it.
  const hasThumb = !!app.thumbnail;
  const thumbUrl = hasThumb ? `/apps/${app.slug}/${app.thumbnail}` : null;

  return (
    <div className={`${aspect} relative w-full overflow-hidden bg-surface-2`}>
      {/* Procedural cover — always rendered. Sits behind any real image. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
        }}
      >
        {/* Very subtle diagonal stripe texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,1) 0 1px, transparent 1px 28px)",
          }}
        />
        {/* Soft radial highlight — hints at depth without glossing */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,0.08) 0%, transparent 55%)",
          }}
        />
        {/* Oversize monogram bleeding off the bottom-left corner.
            Decorative, not loud — low opacity keeps it from competing
            with the card title below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 -left-2 select-none font-serif text-[9rem] font-black leading-none text-white/[0.1] sm:-bottom-8 sm:text-[11rem]"
        >
          {letter}
        </div>
      </div>

      {/* Real thumbnail on top when the file exists. Hidden on 404. */}
      {thumbUrl && !imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
