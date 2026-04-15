"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { isFavorite as isLocalFavorite, toggleFavorite as toggleLocalFavorite } from "@/lib/favorites";

export function FavoriteButton({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((data) => {
          if (data.favorites) setFavorited(data.favorites.includes(slug));
        })
        .catch(() => {});
    } else {
      setFavorited(isLocalFavorite(slug));
    }
  }, [slug, session]);

  async function handleClick() {
    if (loading) return;

    if (session?.user) {
      setLoading(true);
      setFavorited(!favorited);
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        if (res.ok) setFavorited(data.favorited);
      } catch {
        setFavorited(!favorited);
      }
      setLoading(false);
    } else {
      const nowFavorited = toggleLocalFavorite(slug);
      setFavorited(nowFavorited);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-all ${
        favorited
          ? "border-red-500/30 bg-red-500/10 text-red-400"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill={favorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      {favorited ? "Saved" : "Save"}
    </button>
  );
}
