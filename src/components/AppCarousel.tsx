"use client";

import { useRef } from "react";
import type { AppMeta } from "@/types";
import { AppCard } from "./AppCard";

export function AppCarousel({ apps }: { apps: AppMeta[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  return (
    <div className="group/carousel relative">
      <button
        onClick={() => scroll("left")}
        className="absolute -left-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-surface text-muted opacity-0 transition-all hover:text-foreground group-hover/carousel:opacity-100 md:flex"
        aria-label="Scroll left"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute -right-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-surface text-muted opacity-0 transition-all hover:text-foreground group-hover/carousel:opacity-100 md:flex"
        aria-label="Scroll right"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="carousel-scroll flex gap-3 overflow-x-auto py-1"
      >
        {apps.map((app) => (
          <div key={app.slug} className="carousel-item w-[280px] flex-shrink-0">
            <AppCard app={app} />
          </div>
        ))}
      </div>
    </div>
  );
}
