"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Comment } from "@/types";

interface Props {
  slug: string;
  /**
   * "page" — the original layout used inside /app/<slug>; section header,
   *          large input area, generous spacing.
   * "modal" — used inside AppPreviewModal; no header (the modal already
   *           labels the column), tighter spacing, scrollable list with
   *           the input pinned at the bottom by the parent.
   */
  variant?: "page" | "modal";
}

export function CommentsSection({ slug, variant = "page" }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: { comments?: Comment[] }) => {
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
      const data = (await res.json()) as { comments?: Comment[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.comments) setComments(data.comments);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
    setLoading(false);
  }

  // Optimistic vote: toggle locally, then send. Roll back on error.
  async function vote(comment: Comment, dir: -1 | 1) {
    if (!session?.user) return;
    // Click on the same direction → clear; otherwise set new direction.
    const newValue = comment.userVote === dir ? 0 : dir;
    const delta = newValue - comment.userVote;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, userVote: newValue, score: c.score + delta }
          : c
      )
    );

    try {
      const res = await fetch(
        `/api/comments/${encodeURIComponent(String(comment.id))}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: newValue }),
        }
      );
      if (!res.ok) throw new Error("vote failed");
      const data = (await res.json()) as { score: number; userVote: -1 | 0 | 1 };
      // Reconcile with server's authoritative score.
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, score: data.score, userVote: data.userVote }
            : c
        )
      );
    } catch {
      // Roll back on failure.
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, userVote: comment.userVote, score: comment.score }
            : c
        )
      );
    }
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const isModal = variant === "modal";

  // ────────── Comment list ──────────
  const list =
    comments.length === 0 ? (
      <p className={`${isModal ? "text-[12px]" : "text-[13px]"} text-muted`}>
        No comments yet.
      </p>
    ) : (
      <div className={isModal ? "space-y-2" : "space-y-3"}>
        {comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            timeAgo={timeAgo}
            onVote={vote}
            canVote={!!session?.user}
            isModal={isModal}
          />
        ))}
      </div>
    );

  // ────────── Composer ──────────
  const composer = session?.user ? (
    <form onSubmit={handleSubmit} className={isModal ? "" : "mb-4"}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={isModal ? 2 : 2}
        placeholder="Share feedback or suggestions…"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[11px] text-muted">{text.length}/500</span>
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="h-7 rounded-md bg-primary px-3 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
        >
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
    </form>
  ) : (
    <p className={`${isModal ? "text-[12px]" : "mb-4 text-[12px]"} text-muted`}>
      Sign in to leave a comment.
    </p>
  );

  // ────────── Page variant ──────────
  if (!isModal) {
    return (
      <div>
        <h3 className="mb-3 text-[14px] font-semibold">
          Comments{" "}
          {comments.length > 0 && (
            <span className="font-normal text-muted">({comments.length})</span>
          )}
        </h3>
        {composer}
        {list}
      </div>
    );
  }

  // ────────── Modal variant ──────────
  // The list scrolls inside its own column; the composer pins to the
  // bottom via flex-direction:column on the parent.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{list}</div>
      <div className="mt-3 border-t border-border/50 pt-3">{composer}</div>
    </div>
  );
}

function CommentRow({
  comment,
  timeAgo,
  onVote,
  canVote,
  isModal,
}: {
  comment: Comment;
  timeAgo: (s: string) => string;
  onVote: (c: Comment, dir: -1 | 1) => void;
  canVote: boolean;
  isModal: boolean;
}) {
  const upActive = comment.userVote === 1;
  const downActive = comment.userVote === -1;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-border/40 bg-surface ${
        isModal ? "p-2.5" : "p-3"
      }`}
    >
      {/* Vote column */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <button
          type="button"
          aria-label="Upvote"
          onClick={() => onVote(comment, 1)}
          disabled={!canVote}
          className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
            upActive ? "text-emerald-400" : "text-muted hover:text-foreground"
          } disabled:opacity-30 disabled:hover:text-muted`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            upActive
              ? "text-emerald-400"
              : downActive
                ? "text-rose-400"
                : "text-muted"
          }`}
          title={`${comment.score} ${comment.score === 1 || comment.score === -1 ? "vote" : "votes"}`}
        >
          {comment.score}
        </span>
        <button
          type="button"
          aria-label="Downvote"
          onClick={() => onVote(comment, -1)}
          disabled={!canVote}
          className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
            downActive ? "text-rose-400" : "text-muted hover:text-foreground"
          } disabled:opacity-30 disabled:hover:text-muted`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Body column */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          {comment.userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.userAvatar}
              alt=""
              className="h-4 w-4 rounded-full"
            />
          ) : (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-3 text-[9px] font-medium text-muted">
              {comment.userName[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[12px] font-medium">{comment.userName}</span>
          <span className="text-[10px] text-muted">{timeAgo(comment.createdAt)}</span>
        </div>
        <p
          className={`leading-relaxed text-muted-light ${
            isModal ? "text-[12px]" : "text-[13px]"
          } whitespace-pre-wrap break-words`}
        >
          {comment.text}
        </p>
      </div>
    </div>
  );
}
