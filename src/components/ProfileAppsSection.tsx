"use client";

import { useEffect, useState } from "react";
import { AppCard } from "./AppCard";
import type { AppMeta } from "@/types";

export function ProfileAppsSection({ apps }: { apps: AppMeta[] }) {
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/likes/batch")
      .then((r) => r.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (!cancelled && data.counts) setLikeCounts(data.counts);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.slug} app={app} likeCount={likeCounts[app.slug]} />
      ))}
    </div>
  );
}
