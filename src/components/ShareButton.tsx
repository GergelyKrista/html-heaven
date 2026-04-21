"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  title?: string;
  /** Override the URL to share. Defaults to `window.location.href`. */
  url?: string;
  /** Compact icon-only version for app cards. */
  compact?: boolean;
}

// Compose a sensible default share text.
function shareText(title: string) {
  if (!title) return "Check out this HTML5 app on HTML Heaven";
  return `${title} — an HTML5 app on HTML Heaven`;
}

const providers = [
  {
    id: "copy",
    label: "Copy link",
    sub: "Paste anywhere",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.065a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    sub: "Message a contact",
    icon: <span className="text-base leading-none">💬</span>,
    href: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${shareText(title)} ${url}`)}`,
  },
  {
    id: "messenger",
    label: "Messenger",
    sub: "Send on Facebook",
    icon: <span className="text-base leading-none">✉️</span>,
    // Mobile deep link; falls back to facebook.com on desktop
    href: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    sub: "Submit to a subreddit",
    icon: <span className="text-base leading-none">🔴</span>,
    href: (url: string, title: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: "email",
    label: "Email",
    sub: "Open your mail app",
    icon: <span className="text-base leading-none">📧</span>,
    href: (url: string, title: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText(title)}\n\n${url}`)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    sub: "Copy link for your story or bio",
    icon: <span className="text-base leading-none">📸</span>,
    // Instagram doesn't accept direct URL shares — fall back to copy with a hint
  },
  {
    id: "x",
    label: "X / Twitter",
    sub: "Post to X",
    icon: <span className="text-base leading-none">𝕏</span>,
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText(title))}`,
  },
];

export function ShareButton({ title = "", url: urlProp, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function handleProvider(id: string) {
    const url = urlProp || (typeof window !== "undefined" ? window.location.href : "");

    if (id === "copy") {
      navigator.clipboard.writeText(url).catch(() => {});
      showToast("Link copied");
      setOpen(false);
      return;
    }

    if (id === "instagram") {
      // Instagram doesn't support direct URL sharing — best UX is copy + hint
      navigator.clipboard.writeText(url).catch(() => {});
      showToast("Link copied — paste into your story or bio");
      setOpen(false);
      return;
    }

    const provider = providers.find((p) => p.id === id);
    if (!provider?.href) return;
    const href = provider.href(url, title);
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  // Use native share sheet on mobile if available — tap the button directly shares
  async function handlePrimaryClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = urlProp || (typeof window !== "undefined" ? window.location.href : "");

    // On touch devices with native share, prefer it
    if (typeof navigator !== "undefined" && "share" in navigator && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: title || "HTML Heaven",
          text: shareText(title),
          url,
        });
        return;
      } catch {
        // user cancelled or API failed — fall through to menu
      }
    }
    setOpen((v) => !v);
  }

  function handleProviderClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    handleProvider(id);
  }

  return (
    <div ref={ref} className="relative inline-block">
      {compact ? (
        <button
          onClick={handlePrimaryClick}
          title="Share this app"
          aria-label="Share this app"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted transition-all hover:border-primary/30 hover:text-primary-light"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.065a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handlePrimaryClick}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-medium text-muted transition-all hover:text-foreground"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.065a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
          </svg>
          Share
        </button>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border bg-surface-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Share this app
          </div>
          <div className="p-1">
            {providers.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                onClick={(e) => handleProviderClick(e, p.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-3 text-muted-light">
                  {p.icon}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-foreground">{p.label}</span>
                  <span className="block text-[11px] text-muted">{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute right-0 top-10 z-30 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
