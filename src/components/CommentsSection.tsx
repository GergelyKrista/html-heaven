"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Comment } from "@/types";

interface Props {
  slug: string;
  /**
   * "page" — original layout used inside /app/<slug>; section header,
   *          generous spacing.
   * "modal" — used inside AppPreviewModal; no header (the modal column
   *           already labels itself), tighter spacing, scrollable list
   *           with the composer pinned at the bottom.
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

  // Server is the source of truth; passing null parentId means top-level.
  async function postComment(value: string, parentId: number | null) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, text: value, parentId }),
    });
    const data = (await res.json()) as { comments?: Comment[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Failed");
    if (data.comments) setComments(data.comments);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      await postComment(text.trim(), null);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
    setLoading(false);
  }

  // Optimistic vote: works on either top-level or reply. Walks the tree.
  async function vote(comment: Comment, dir: -1 | 1) {
    if (!session?.user) return;
    const newValue = comment.userVote === dir ? 0 : dir;
    const delta = newValue - comment.userVote;

    // Optimistic update — apply to comment in place via tree walk.
    setComments((prev) => updateInTree(prev, comment.id, (c) => ({
      ...c,
      userVote: newValue,
      score: c.score + delta,
    })));

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
      setComments((prev) => updateInTree(prev, comment.id, (c) => ({
        ...c,
        score: data.score,
        userVote: data.userVote,
      })));
    } catch {
      // Roll back on failure.
      setComments((prev) => updateInTree(prev, comment.id, (c) => ({
        ...c,
        userVote: comment.userVote,
        score: comment.score,
      })));
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
  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  );

  // ────────── Comment list ──────────
  const list =
    comments.length === 0 ? (
      <p className={`${isModal ? "text-[12px]" : "text-[13px]"} text-muted`}>
        No comments yet.
      </p>
    ) : (
      <div className={isModal ? "space-y-2" : "space-y-3"}>
        {comments.map((comment) => (
          <ThreadedComment
            key={comment.id}
            comment={comment}
            timeAgo={timeAgo}
            onVote={vote}
            onReply={postComment}
            canPost={!!session?.user}
            isModal={isModal}
          />
        ))}
      </div>
    );

  // ────────── Top-level composer ──────────
  const composer = session?.user ? (
    <form onSubmit={handleSubmit} className={isModal ? "" : "mb-4"}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={2}
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

  if (!isModal) {
    return (
      <div>
        <h3 className="mb-3 text-[14px] font-semibold">
          Comments{" "}
          {totalCount > 0 && (
            <span className="font-normal text-muted">({totalCount})</span>
          )}
        </h3>
        {composer}
        {list}
      </div>
    );
  }

  // Modal variant: scroll inside the column, composer pinned to the bottom.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{list}</div>
      <div className="mt-3 border-t border-border/50 pt-3">{composer}</div>
    </div>
  );
}

// Walks the tree and replaces a comment by id, preserving immutability
// so React picks up the change. Top-level → updated. Reply → updated
// inside its parent's replies array.
function updateInTree(
  list: Comment[],
  id: number,
  fn: (c: Comment) => Comment
): Comment[] {
  return list.map((c) => {
    if (c.id === id) return fn(c);
    if (c.replies?.length) {
      const next = c.replies.map((r) => (r.id === id ? fn(r) : r));
      if (next !== c.replies) return { ...c, replies: next };
    }
    return c;
  });
}

function ThreadedComment({
  comment,
  timeAgo,
  onVote,
  onReply,
  canPost,
  isModal,
}: {
  comment: Comment;
  timeAgo: (s: string) => string;
  onVote: (c: Comment, dir: -1 | 1) => void;
  onReply: (text: string, parentId: number) => Promise<void>;
  canPost: boolean;
  isModal: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || replyLoading) return;
    setReplyLoading(true);
    setReplyError("");
    try {
      await onReply(replyText.trim(), comment.id);
      setReplyText("");
      setReplyOpen(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to post");
    }
    setReplyLoading(false);
  }

  return (
    <div>
      <CommentRow
        comment={comment}
        timeAgo={timeAgo}
        onVote={onVote}
        canVote={canPost}
        isModal={isModal}
        rightControls={
          canPost ? (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="text-[11px] font-medium text-muted hover:text-foreground"
            >
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          ) : null
        }
      />

      {replyOpen && canPost && (
        <form onSubmit={submitReply} className="ml-6 mt-1.5 sm:ml-8">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={500}
            rows={2}
            autoFocus
            placeholder={`Reply to ${comment.userName}…`}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-muted">{replyText.length}/500</span>
            <button
              type="submit"
              disabled={!replyText.trim() || replyLoading}
              className="h-6 rounded-md bg-primary px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              {replyLoading ? "Posting…" : "Post"}
            </button>
          </div>
          {replyError && <p className="mt-1 text-[11px] text-red-400">{replyError}</p>}
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l border-border/40 pl-3 sm:ml-8">
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              timeAgo={timeAgo}
              onVote={onVote}
              canVote={canPost}
              isModal={isModal}
              rightControls={null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  timeAgo,
  onVote,
  canVote,
  isModal,
  rightControls,
}: {
  comment: Comment;
  timeAgo: (s: string) => string;
  onVote: (c: Comment, dir: -1 | 1) => void;
  canVote: boolean;
  isModal: boolean;
  rightControls: React.ReactNode;
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
          {rightControls && <span className="ml-auto">{rightControls}</span>}
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
