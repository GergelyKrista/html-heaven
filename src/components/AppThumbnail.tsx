"use client";

import { useState } from "react";
import type { AppMeta } from "@/types";
import { CATEGORIES, isValidCategory } from "@/lib/categories";

// Two-color gradient palettes chosen by slug hash — each app gets a
// deterministic unique cover, so even without a real screenshot the grid
// has visual variety you can scan.
const GRADIENTS = [
  { from: "#f97316", to: "#e04a2f", glyph: "#fff" },  // orange → red
  { from: "#22d3ee", to: "#3b82f6", glyph: "#fff" },  // cyan  → blue
  { from: "#a78bfa", to: "#7c3aed", glyph: "#fff" },  // violet → purple
  { from: "#10b981", to: "#059669", glyph: "#fff" },  // emerald → green
  { from: "#f472b6", to: "#db2777", glyph: "#fff" },  // pink   → fuchsia
  { from: "#fbbf24", to: "#d97706", glyph: "#fff" },  // amber  → orange
  { from: "#64748b", to: "#334155", glyph: "#fff" },  // slate (utilitarian)
  { from: "#f87171", to: "#dc2626", glyph: "#fff" },  // red
  { from: "#34d399", to: "#0d9488", glyph: "#fff" },  // teal
  { from: "#818cf8", to: "#4338ca", glyph: "#fff" },  // indigo
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = slug.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function categoryIcon(app: AppMeta): string {
  // The first tag is the canonical category (enforced by submit API)
  const first = app.tags[0];
  if (first && isValidCategory(first)) {
    const cat = CATEGORIES.find((c) => c.id === first);
    if (cat) return cat.icon;
  }
  // Legacy keyword inference for pre-category apps
  const t = app.tags.map((x) => x.toLowerCase());
  if (t.some((x) => ["games", "game", "arcade", "puzzle"].includes(x))) return "🎮";
  if (t.some((x) => ["tools", "utilities", "calculator", "counter", "converter"].includes(x))) return "🛠️";
  if (t.some((x) => ["creative", "art", "drawing", "music", "design"].includes(x))) return "🎨";
  if (t.some((x) => ["learning", "education", "cheatsheet", "guide"].includes(x))) return "📚";
  if (t.some((x) => ["productivity", "timer", "pomodoro"].includes(x))) return "⏱️";
  if (t.some((x) => ["exercise", "fitness", "workout"].includes(x))) return "💪";
  if (t.some((x) => ["travel"].includes(x))) return "✈️";
  if (t.some((x) => ["ai-skill", "claude-skill", "anthropic"].includes(x))) return "🤖";
  if (t.some((x) => ["fun", "humor"].includes(x))) return "✨";
  return "📦";
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
  const icon = categoryIcon(app);

  // Only attempt an image if the app.json has a non-default thumbnail value.
  // "thumbnail.png" is the placeholder every app.json ships with — we can't
  // tell client-side whether the file actually exists, so we try to load it
  // and fall back to procedural on error.
  const hasThumb = !!app.thumbnail;
  const thumbUrl = hasThumb ? `/apps/${app.slug}/${app.thumbnail}` : null;

  return (
    <div className={`${aspect} relative w-full overflow-hidden`}>
      {/* Procedural cover — always rendered. Sits behind any real image. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
        }}
      >
        {/* Subtle diagonal stripe overlay for texture */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 14px)",
          }}
        />
        {/* Radial highlight for depth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 25% 0%, rgba(255,255,255,0.2) 0%, transparent 55%)",
          }}
        />
        {/* Category glyph */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[54px] drop-shadow-sm sm:text-[64px]"
          style={{ color: grad.glyph }}
          aria-hidden
        >
          {icon}
        </div>
      </div>

      {/* Real thumbnail (if any) on top. Hidden on error. */}
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
