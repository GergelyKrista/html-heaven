"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Comment } from "@/types";

export function CommentsSection({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.comments) setComments(data.comments);
      })
      .catch(() => {});
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setComments(data.comments);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
    setLoading(false);
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div>
      <h3 className="mb-3 text-[14px] font-semibold">
        Comments {comments.length > 0 && <span className="text-muted font-normal">({comments.length})</span>}
      </h3>

      {/* Comment form */}
      {session?.user ? (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Share feedback or suggestions..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none resize-none"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] text-muted">{text.length}/500</span>
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="h-7 rounded-md bg-primary px-3 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
          {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
        </form>
      ) : (
        <p className="mb-4 text-[12px] text-muted">
          Sign in to leave a comment.
        </p>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-[13px] text-muted">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border/50 bg-surface p-3">
              <div className="mb-1.5 flex items-center gap-2">
                {comment.userAvatar ? (
                  <img
                    src={comment.userAvatar}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-muted">
                    {comment.userName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-[12px] font-medium">{comment.userName}</span>
                <span className="text-[11px] text-muted">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-light">{comment.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
