"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  slug: string;
  title: string;
  /** When true, renders as a small icon-only button (for AppCard). */
  compact?: boolean;
}

/**
 * Delete button + confirmation modal. The user must type the exact app
 * title to enable the destructive button — prevents accidental deletes.
 */
export function DeleteAppMenu({ slug, title, compact = false }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ prUrl: string; autoMerged: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canConfirm = typed.trim() === title.trim();

  // Autofocus when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showModal]);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
    setTyped("");
    setReason("");
    setError("");
    setResult(null);
  }

  function close(e?: React.MouseEvent) {
    e?.stopPropagation();
    setShowModal(false);
  }

  async function doDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canConfirm || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/apps/${encodeURIComponent(slug)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = (await res.json()) as {
        error?: string;
        prUrl?: string;
        autoMerged?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setResult({ prUrl: data.prUrl || "", autoMerged: data.autoMerged ?? false });
      // If auto-merged, hard-navigate away after a moment
      if (data.autoMerged) {
        setTimeout(() => {
          window.location.href = "/browse";
        }, 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
    setSubmitting(false);
  }

  return (
    <>
      {compact ? (
        <button
          onClick={open}
          title="Delete this app"
          aria-label="Delete this app"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted transition-all hover:border-red-500/30 hover:text-red-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      ) : (
        <button
          onClick={open}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-medium text-muted transition-all hover:border-red-500/30 hover:text-red-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </button>
      )}

      {showModal && typeof document !== "undefined" && createPortal(
        // Render the modal at the body level via a portal so it escapes
        // the AppCard's outer <button>. With the modal as a DOM child of
        // that button, typing a space in the confirm-by-name input (e.g.
        // "My App Name") bubbled up and synthesized a click on the
        // button, popping the preview modal open behind the delete flow.
        // stopPropagation on keyDown is a belt-and-suspenders so if this
        // ever gets rendered inside an interactive ancestor again, the
        // bug doesn't return.
        <div
          onClick={close}
          onKeyDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            {result ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <h2 className="text-[15px] font-semibold">
                    {result.autoMerged ? "Deleted" : "Deletion pending"}
                  </h2>
                </div>
                <p className="text-[13px] text-muted-light">
                  {result.autoMerged
                    ? "The app has been removed from the repo. The live site will update after the next deploy (~1–2 minutes)."
                    : "Your deletion request has been submitted as a pull request. An admin will review and merge it shortly. The app is already hidden from the site."}
                </p>
                {result.prUrl && (
                  <a
                    href={result.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-[13px] text-primary-light hover:underline"
                  >
                    View pull request →
                  </a>
                )}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={close}
                    className="h-9 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-[15px] font-semibold text-red-400">
                  Delete &ldquo;{title}&rdquo;?
                </h2>
                <p className="mb-4 text-[13px] text-muted-light">
                  This will remove the app&apos;s files from the repo via a pull request.
                  This action cannot be undone from this UI.
                </p>

                <label className="mb-4 block">
                  <span className="mb-1 block text-[12px] font-medium text-muted">
                    Type <span className="font-mono text-foreground">{title}</span> to confirm
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={title}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted focus:border-red-500/60 focus:outline-none"
                  />
                </label>

                <label className="mb-4 block">
                  <span className="mb-1 block text-[12px] font-medium text-muted">
                    Reason <span className="font-normal">(optional)</span>
                  </span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. accidentally included secret"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
                  />
                </label>

                {error && (
                  <p className="mb-3 text-[12px] text-red-400">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={close}
                    disabled={submitting}
                    className="h-9 rounded-lg border border-border px-4 text-[13px] font-medium text-muted-light hover:text-foreground disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doDelete}
                    disabled={!canConfirm || submitting}
                    className="h-9 rounded-lg bg-red-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-30"
                  >
                    {submitting ? "Deleting..." : "Delete permanently"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
