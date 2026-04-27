"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActivityEvent } from "@/lib/db";
import { getAllAppsSync } from "@/lib/apps";

// Renders only on screens ≥ 1700 px wide via the `min-[1700px]:block`
// breakpoint — that's where there's enough margin alongside the centred
// max-w-6xl content column to fit a 272 px rail without overlap.
//
// Client component because the feed needs to update across deploys
// (otherwise we'd cache stale activity into the prerendered HTML of
// static pages like /, /browse, /favorites). Hits /api/activity on
// mount; the API caches at the edge for 60 s.

function relativeTime(iso: string): string {
  const ts = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.max(0, (Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`;
  return `${Math.floor(diffSec / (86400 * 7))}w`;
}

function verb(type: ActivityEvent["type"]): string {
  if (type === "like") return "liked";
  if (type === "comment") return "commented on";
  return "submitted";
}

export function ActivityRail() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  // App slug → title lookup, baked from the static manifest at build
  // time. Cheap to compute once.
  const titleBySlug = new Map(
    getAllAppsSync().map((a) => [a.slug, a.title])
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data: { events?: ActivityEvent[] }) => {
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render the rail at all until we have data, and don't render
  // it if there's no activity to show. (Empty 30-day window is
  // possible on a quiet week.)
  if (events === null || events.length === 0) return null;

  return (
    <aside
      className="pointer-events-none fixed right-6 top-24 hidden w-72 min-[1700px]:block"
      aria-label="Recent activity"
    >
      <div className="pointer-events-auto rounded-xl border border-border/60 bg-surface/80 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted">
            Recent activity
          </h2>
          <span
            className="h-2 w-2 rounded-full bg-emerald-400"
            aria-hidden
            title="Live from the database"
          />
        </div>

        <ul className="space-y-3">
          {events.map((e, i) => {
            const title = titleBySlug.get(e.appSlug) ?? e.appSlug;
            const userLabel = e.userName ?? e.userHandle ?? "someone";
            return (
              <li
                key={`${e.type}-${e.appSlug}-${e.userId}-${i}`}
                className="flex items-start gap-2.5"
              >
                {e.userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.userAvatar}
                    alt=""
                    className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-border/60"
                  />
                ) : (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted">
                    {userLabel[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-light">
                  {e.userHandle ? (
                    <Link
                      href={`/u/${e.userHandle}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {userLabel}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {userLabel}
                    </span>
                  )}{" "}
                  <span className="text-muted">{verb(e.type)}</span>{" "}
                  <Link
                    href={`/app/${e.appSlug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {title}
                  </Link>
                  <span className="ml-1 text-muted/70">
                    · {relativeTime(e.ts)}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
