"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AppMeta } from "@/types";
import type { UserProfile, ProfileStats } from "@/lib/users";
import { FavoriteButton } from "./FavoriteButton";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { AppThumbnail } from "./AppThumbnail";

interface Props {
  app: AppMeta;
  onClose: () => void;
}

interface MetaResponse {
  submitter: UserProfile | null;
  stats: ProfileStats | null;
  likeCount: number;
}

export function AppPreviewModal({ app, onClose }: Props) {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const appUrl = `/apps/${app.slug}/index.html`;
  const shareUrl = `https://htmlheaven.com/apps/${app.slug}/index.html`;
  const dateStr = new Date(app.dateAdded).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while the modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/apps/${encodeURIComponent(app.slug)}/meta`)
      .then((r) => r.json())
      .then((data: MetaResponse) => {
        if (!cancelled) {
          setMeta(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [app.slug]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero thumbnail */}
        <AppThumbnail app={app} aspect="aspect-[2/1]" />

        {/* Header block */}
        <div className="px-5 pb-4 pt-6 sm:px-6">
          {/* Tags row */}
          {app.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {app.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold leading-tight text-foreground">{app.title}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-light">
            {app.description}
          </p>

          <p className="mt-3 text-[12px] text-muted">Added {dateStr}</p>
        </div>

        {/* Submitter card */}
        <div className="border-y border-border/50 bg-surface-2/40 px-5 py-4 sm:px-6">
          {loading ? (
            <div className="text-[13px] text-muted">Loading submitter info...</div>
          ) : meta?.submitter ? (
            <SubmitterBlock submitter={meta.submitter} stats={meta.stats} likeCount={meta.likeCount} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-[13px] font-semibold text-muted">
                {app.author[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-[14px] font-medium">{app.author}</p>
                <p className="text-[12px] text-muted">
                  {meta?.likeCount ?? 0} {meta?.likeCount === 1 ? "like" : "likes"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action row + launch */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton slug={app.slug} />
            <LikeButton slug={app.slug} />
            <ShareButton title={app.title} url={shareUrl} />
          </div>

          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Launch app
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function SubmitterBlock({
  submitter,
  stats,
  likeCount,
}: {
  submitter: UserProfile;
  stats: ProfileStats | null;
  likeCount: number;
}) {
  return (
    <div className="flex items-start gap-3">
      {submitter.avatar ? (
        <img src={submitter.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full border border-border" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[14px] font-semibold text-muted">
          {submitter.name[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {submitter.handle ? (
            <Link href={`/u/${submitter.handle}`} className="text-[14px] font-semibold hover:underline">
              {submitter.name}
            </Link>
          ) : (
            <span className="text-[14px] font-semibold">{submitter.name}</span>
          )}
          {submitter.handle && (
            <span className="text-[12px] text-muted">@{submitter.handle}</span>
          )}
        </div>
        {submitter.bio && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-light">
            {submitter.bio}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
          <span>
            <strong className="text-foreground">{likeCount}</strong>{" "}
            {likeCount === 1 ? "like" : "likes"} on this app
          </span>
          {stats && (
            <>
              <span>·</span>
              <span>
                <strong className="text-foreground">{stats.appsSubmitted}</strong>{" "}
                {stats.appsSubmitted === 1 ? "app" : "apps"} total
              </span>
              {stats.followers > 0 && (
                <>
                  <span>·</span>
                  <span>
                    <strong className="text-foreground">{stats.followers}</strong>{" "}
                    {stats.followers === 1 ? "follower" : "followers"}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
