"use client";

import { useState, useMemo } from "react";
import type { AppMeta } from "@/types";
import { AppCard } from "./AppCard";
import { SearchBar } from "./SearchBar";
import { TagFilter } from "./TagFilter";

type SortOption = "newest" | "alphabetical";

export function AppGrid({
  apps,
  allTags,
}: {
  apps: AppMeta[];
  allTags: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const filtered = useMemo(() => {
    let result = apps;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (app) =>
          app.title.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((app) =>
        selectedTags.some((tag) => app.tags.includes(tag))
      );
    }

    if (sort === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    } else {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [apps, search, selectedTags, sort]);

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground focus:border-border-light focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="alphabetical">A–Z</option>
          </select>
        </div>
        <TagFilter tags={allTags} selected={selectedTags} onToggle={toggleTag} />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-[14px] text-muted">No apps match your search</p>
        </div>
      )}
    </div>
  );
}
