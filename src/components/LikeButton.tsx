"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function LikeButton({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/likes?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setLiked(data.liked ?? false);
      })
      .catch(() => {});
  }, [slug]);

  async function handleClick() {
    if (!session?.user || loading) return;
    setLoading(true);
    setLiked(!liked);
    setCount((c) => (liked ? c - 1 : c + 1));

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setCount(data.count);
      }
    } catch {
      setLiked(!liked);
      setCount((c) => (liked ? c + 1 : c - 1));
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || !session?.user}
      title={!session?.user ? "Sign in to like" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-all ${
        liked
          ? "border-primary/30 bg-primary-soft text-primary-light"
          : "border-border bg-surface text-muted hover:text-foreground"
      } ${!session?.user ? "opacity-60 cursor-default" : ""}`}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
      {count > 0 ? count : "Like"}
    </button>
  );
}
