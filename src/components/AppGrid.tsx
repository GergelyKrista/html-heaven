"use client";

import { useState, useMemo, useEffect } from "react";
import type { AppMeta } from "@/types";
import { AppCard } from "./AppCard";
import { SearchBar } from "./SearchBar";
import { TagFilter } from "./TagFilter";
import { CATEGORIES, isValidCategory, type CategoryId } from "@/lib/categories";

type SortOption = "popular" | "newest" | "alphabetical";
type ViewMode = "grid" | "grouped";

// Work out which category an app belongs to. Prefers explicit first-tag match
// on a known category id; falls back to legacy keyword mapping; otherwise "other".
function categorizeApp(app: AppMeta): CategoryId {
  for (const tag of app.tags) {
    if (isValidCategory(tag)) return tag;
  }
  // Legacy fallback mappings for apps submitted before categories existed
  const lowerTags = app.tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => ["games", "game", "arcade", "puzzle"].includes(t))) return "games";
  if (lowerTags.some((t) => ["tools", "utilities", "utility", "calculator", "counter", "converter"].includes(t))) return "tools";
  if (lowerTags.some((t) => ["creative", "art", "drawing", "music", "design"].includes(t))) return "creative";
  if (lowerTags.some((t) => ["education", "learning", "language", "cheatsheet", "guide"].includes(t))) return "learning";
  if (lowerTags.some((t) => ["productivity", "timer", "pomodoro", "todo"].includes(t))) return "productivity";
  if (lowerTags.some((t) => ["exercise", "workout", "fitness", "yoga", "cardio"].includes(t))) return "exercise";
  if (lowerTags.some((t) => ["travel", "trip-planner", "phrasebook", "itinerary"].includes(t))) return "travel";
  if (lowerTags.some((t) => ["ai-skill", "claude-skill", "anthropic", "prompt"].includes(t))) return "ai-skill";
  if (lowerTags.some((t) => ["fun", "humor", "random"].includes(t))) return "fun";
  return "other";
}

export function AppGrid({ apps, allTags }: { apps: AppMeta[]; allTags: string[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("popular");
  const [view, setView] = useState<ViewMode>("grid");
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Fetch like counts once on mount — used for the "Most liked" sort
  // and also shown on each AppCard.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/likes/batch")
      .then((r) => r.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (!cancelled && data.counts) setLikeCounts(data.counts);
      })
      .catch(() => {
        // Not critical — sort falls back to newest ordering
      });
    return () => { cancelled = true; };
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Annotate apps with their resolved category once
  const appsWithCategory = useMemo(
    () => apps.map((app) => ({ ...app, _category: categorizeApp(app) })),
    [apps]
  );

  // Count apps per category (on the full set, not filtered)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of appsWithCategory) {
      counts[app._category] = (counts[app._category] || 0) + 1;
    }
    return counts;
  }, [appsWithCategory]);

  // Apps shown after all filters (except category grouping)
  const filtered = useMemo(() => {
    let result = appsWithCategory;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (app) =>
          app.title.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((app) => app._category === selectedCategory);
    }

    if (selectedTags.length > 0) {
      result = result.filter((app) =>
        selectedTags.every((tag) => app.tags.includes(tag))
      );
    }

    if (sort === "popular") {
      // Rank by likes. Ties broken by recency (newer first).
      result = [...result].sort((a, b) => {
        const la = likeCounts[a.slug] || 0;
        const lb = likeCounts[b.slug] || 0;
        if (lb !== la) return lb - la;
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      });
    } else if (sort === "newest") {
      result = [...result].sort(
        (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    } else {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [appsWithCategory, search, selectedCategory, selectedTags, sort, likeCounts]);

  // Tags available in the current category filter (so they don't clutter)
  const relevantTags = useMemo(() => {
    if (selectedCategory === "all") return allTags;
    const tagSet = new Set<string>();
    for (const app of appsWithCategory) {
      if (app._category !== selectedCategory) continue;
      for (const t of app.tags) {
        if (!isValidCategory(t)) tagSet.add(t);
      }
    }
    return [...tagSet].sort();
  }, [allTags, appsWithCategory, selectedCategory]);

  // Group view: partition filtered apps by category
  const grouped = useMemo(() => {
    const groups = new Map<CategoryId, typeof filtered>();
    for (const app of filtered) {
      const existing = groups.get(app._category) || [];
      existing.push(app);
      groups.set(app._category, existing);
    }
    // Sort groups in the canonical order from CATEGORIES, skipping empties
    return CATEGORIES.map((c) => ({
      category: c,
      apps: groups.get(c.id) || [],
    })).filter((g) => g.apps.length > 0);
  }, [filtered]);

  return (
    <div>
      {/* Search + sort + view toggle row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground focus:border-border-light focus:outline-none"
        >
          <option value="popular">Most liked</option>
          <option value="newest">Newest</option>
          <option value="alphabetical">A–Z</option>
        </select>
        <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              view === "grid" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            }`}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            onClick={() => setView("grouped")}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              view === "grouped" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            }`}
            aria-label="Grouped by category"
          >
            Grouped
          </button>
        </div>
      </div>

      {/* Category pills with counts */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-primary text-white"
              : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          All <span className="opacity-70">{apps.length}</span>
        </button>
        {CATEGORIES.map((c) => {
          const count = categoryCounts[c.id] || 0;
          if (count === 0) return null;
          const active = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                active ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tag filter (narrows within the selected category) */}
      {relevantTags.length > 0 && (
        <div className="mb-5">
          <TagFilter tags={relevantTags} selected={selectedTags} onToggle={toggleTag} />
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-[14px] text-muted">No apps match your search</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <AppCard key={app.slug} app={app} likeCount={likeCounts[app.slug]} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, apps: groupApps }) => (
            <section key={category.id}>
              <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                  <span>{category.icon}</span>
                  {category.label}
                  <span className="text-[12px] font-normal text-muted">({groupApps.length})</span>
                </h2>
                <p className="hidden text-[12px] text-muted sm:block">{category.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupApps.map((app) => (
                  <AppCard key={app.slug} app={app} likeCount={likeCounts[app.slug]} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
