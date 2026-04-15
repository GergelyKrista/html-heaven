"use client";

import { useState, useEffect } from "react";
import { hasVoted, toggleVote } from "@/lib/votes";

export function VoteButton({ slug }: { slug: string }) {
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    setVoted(hasVoted(slug));
  }, [slug]);

  return (
    <button
      onClick={() => setVoted(toggleVote(slug))}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-all ${
        voted
          ? "border-primary/30 bg-primary-soft text-primary-light"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
      {voted ? "Upvoted" : "Upvote"}
    </button>
  );
}
