"use client";

import { useState } from "react";
import type { AppMeta } from "@/types";
import { FavoriteButton } from "./FavoriteButton";
import { ShareButton } from "./ShareButton";
import { DeleteAppMenu } from "./DeleteAppMenu";
import { useOwnership } from "./OwnershipProvider";
import { AppPreviewModal } from "./AppPreviewModal";

// Deterministic color based on slug — each app gets a unique accent
const cardAccents = [
  { bg: "bg-rose-500/8", border: "border-rose-500/20", dot: "bg-rose-400" },
  { bg: "bg-amber-500/8", border: "border-amber-500/20", dot: "bg-amber-400" },
  { bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  { bg: "bg-sky-500/8", border: "border-sky-500/20", dot: "bg-sky-400" },
  { bg: "bg-violet-500/8", border: "border-violet-500/20", dot: "bg-violet-400" },
  { bg: "bg-pink-500/8", border: "border-pink-500/20", dot: "bg-pink-400" },
  { bg: "bg-cyan-500/8", border: "border-cyan-500/20", dot: "bg-cyan-400" },
  { bg: "bg-orange-500/8", border: "border-orange-500/20", dot: "bg-orange-400" },
];

function getAccent(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cardAccents[Math.abs(hash) % cardAccents.length];
}

export function AppCard({ app, likeCount }: { app: AppMeta; likeCount?: number }) {
  const accent = getAccent(app.slug);
  // Share the detail page, not the raw HTML file — the detail page carries
  // OG + Twitter meta tags, so chat apps generate a proper preview card.
  const shareUrl = `https://htmlheaven.com/app/${app.slug}`;
  const { canDelete } = useOwnership();
  const showDelete = canDelete(app.slug);
  const [previewOpen, setPreviewOpen] = useState(false);

  function openPreview(e: React.MouseEvent) {
    // Ignore clicks on the action buttons cluster
    const target = e.target as HTMLElement;
    if (target.closest("[data-card-actions]")) return;
    setPreviewOpen(true);
  }

  return (
    <>
      <button
        onClick={openPreview}
        aria-label={`Preview ${app.title}`}
        type="button"
        className="card-glow group flex w-full flex-col rounded-xl border border-border/60 bg-surface text-left transition-all duration-200 hover:bg-surface-2"
      >
        <div className="flex flex-1 flex-col p-4">
          {/* Top row: accent dot + primary tag, like count, author */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {app.tags[0]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {likeCount !== undefined && likeCount > 0 && (
                <span
                  className="flex items-center gap-0.5 text-[11px] font-medium text-muted"
                  title={`${likeCount} like${likeCount === 1 ? "" : "s"}`}
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  {likeCount}
                </span>
              )}
              <span className="text-[11px] text-muted/60">{app.author}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-foreground">
            {app.title}
          </h3>

          {/* Description */}
          <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-muted-light">
            {app.description}
          </p>

          {/* Footer: tags + action buttons */}
          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {app.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
            {/* data-card-actions marks this cluster so the card-level click handler
                can detect and ignore clicks that land here. Each inner button also
                calls stopPropagation as belt-and-suspenders. */}
            <div data-card-actions className="flex items-center gap-1.5">
              <FavoriteButton slug={app.slug} compact />
              <ShareButton title={app.title} url={shareUrl} compact />
              {showDelete && <DeleteAppMenu slug={app.slug} title={app.title} compact />}
            </div>
          </div>
        </div>
      </button>

      {previewOpen && (
        <AppPreviewModal app={app} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}
