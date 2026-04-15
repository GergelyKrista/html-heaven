"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { AppMeta } from "@/types";
import { getFavorites } from "@/lib/favorites";
import { AppCard } from "@/components/AppCard";

export function FavoritesView({ allApps }: { allApps: AppMeta[] }) {
  const { data: session } = useSession();
  const [favoriteApps, setFavoriteApps] = useState<AppMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (session?.user) {
      // Fetch from server
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((data) => {
          if (data.favorites) {
            setFavoriteApps(allApps.filter((app) => data.favorites.includes(app.slug)));
          }
          setLoaded(true);
        })
        .catch(() => {
          // Fallback to localStorage
          const slugs = getFavorites();
          setFavoriteApps(allApps.filter((app) => slugs.includes(app.slug)));
          setLoaded(true);
        });
    } else {
      const slugs = getFavorites();
      setFavoriteApps(allApps.filter((app) => slugs.includes(app.slug)));
      setLoaded(true);
    }
  }, [allApps, session]);

  if (!loaded) {
    return <div className="mt-8 text-[13px] text-muted">Loading...</div>;
  }

  if (favoriteApps.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-surface py-16 text-center">
        <p className="text-[14px] text-foreground">No favorites yet</p>
        <p className="mt-1 text-[13px] text-muted">
          Browse the collection and save apps you like.
        </p>
        <Link
          href="/browse"
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Browse apps
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {favoriteApps.map((app) => (
        <AppCard key={app.slug} app={app} />
      ))}
    </div>
  );
}
