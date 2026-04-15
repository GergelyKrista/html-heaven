"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import type { AppMeta } from "@/types";

interface ProfileData {
  user: { name: string; email: string; image: string | null };
  favorites: { slug: string; createdAt: string }[];
  likes: { slug: string; createdAt: string }[];
  comments: { id: number; appSlug: string; text: string; createdAt: string }[];
}

export function ProfileView({ allApps }: { allApps: AppMeta[] }) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"favorites" | "likes" | "comments">("favorites");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getApp(slug: string) {
    return allApps.find((a) => a.slug === slug);
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (loading) {
    return <p className="text-[13px] text-muted">Loading...</p>;
  }

  if (!profile) {
    return <p className="text-[13px] text-muted">Failed to load profile.</p>;
  }

  const tabs = [
    { key: "favorites" as const, label: "Saved", count: profile.favorites.length },
    { key: "likes" as const, label: "Liked", count: profile.likes.length },
    { key: "comments" as const, label: "Comments", count: profile.comments.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              className="h-14 w-14 rounded-full"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-xl font-semibold text-muted">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{session?.user?.name}</h1>
            <p className="text-[13px] text-muted">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="h-8 rounded-md border border-border px-3 text-[12px] font-medium text-muted transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/60 bg-surface p-4 text-center">
          <p className="text-2xl font-semibold">{profile.favorites.length}</p>
          <p className="text-[12px] text-muted">Saved</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface p-4 text-center">
          <p className="text-2xl font-semibold">{profile.likes.length}</p>
          <p className="text-[12px] text-muted">Liked</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface p-4 text-center">
          <p className="text-2xl font-semibold">{profile.comments.length}</p>
          <p className="text-[12px] text-muted">Comments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-0.5 border-b border-border/50">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors ${
              tab === t.key ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-[11px] text-muted">{t.count}</span>
            )}
            {tab === t.key && (
              <span className="absolute bottom-0 left-3 right-3 h-px bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "favorites" && (
        <div>
          {profile.favorites.length === 0 ? (
            <Empty message="No saved apps yet." />
          ) : (
            <div className="space-y-1">
              {profile.favorites.map((fav) => {
                const app = getApp(fav.slug);
                return (
                  <AppRow
                    key={fav.slug}
                    slug={fav.slug}
                    title={app?.title || fav.slug}
                    description={app?.description}
                    time={timeAgo(fav.createdAt)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "likes" && (
        <div>
          {profile.likes.length === 0 ? (
            <Empty message="No liked apps yet." />
          ) : (
            <div className="space-y-1">
              {profile.likes.map((like) => {
                const app = getApp(like.slug);
                return (
                  <AppRow
                    key={like.slug}
                    slug={like.slug}
                    title={app?.title || like.slug}
                    description={app?.description}
                    time={timeAgo(like.createdAt)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "comments" && (
        <div>
          {profile.comments.length === 0 ? (
            <Empty message="No comments yet." />
          ) : (
            <div className="space-y-2">
              {profile.comments.map((comment) => {
                const app = getApp(comment.appSlug);
                return (
                  <div key={comment.id} className="rounded-lg border border-border/50 bg-surface p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <Link
                        href={`/app/${comment.appSlug}`}
                        className="text-[13px] font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {app?.title || comment.appSlug}
                      </Link>
                      <span className="text-[11px] text-muted">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-light">{comment.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppRow({ slug, title, description, time }: { slug: string; title: string; description?: string; time: string }) {
  return (
    <Link
      href={`/app/${slug}`}
      className="flex items-center justify-between rounded-lg border border-border/50 bg-surface p-3 transition-colors hover:bg-surface-2"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 truncate text-[12px] text-muted">{description}</p>
        )}
      </div>
      <span className="ml-3 shrink-0 text-[11px] text-muted">{time}</span>
    </Link>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface py-10 text-center">
      <p className="text-[13px] text-muted">{message}</p>
      <Link
        href="/browse"
        className="mt-3 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12px] font-medium text-white hover:bg-primary-hover"
      >
        Browse apps
      </Link>
    </div>
  );
}
