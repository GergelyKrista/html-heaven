import type { AppMeta } from "@/types";

// Deterministic color based on slug — each app gets a unique accent
const cardAccents = [
  { bg: "bg-rose-500/8", border: "border-rose-500/20", dot: "bg-rose-400" },
  { bg: "bg-amber-500/8", border: "border-amber-500/20", dot: "bg-amber-400" },
  { bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  { bg: "bg-sky-500/8", border: "border-sky-500/20", dot: "bg-sky-400" },
  { bg: "bg-violet-500/8", border: "border-violet-500/20", dot: "bg-violet-400" },
  { bg: "bg-pink-500/8", border: "border-pink-500/20", dot: "bg-pink-400" },
  { bg: "bg-cyan-500/8", border: "border-cyan-500/20", dot: "bg-cyan-400" },
  { bg: "bg-orange-500/8", border: "border-orange-500/20", dot: "bg-orange-400" },
];

function getAccent(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cardAccents[Math.abs(hash) % cardAccents.length];
}

export function AppCard({ app }: { app: AppMeta }) {
  const accent = getAccent(app.slug);

  return (
    <a
      href={`/apps/${app.slug}/index.html`}
      target="_blank"
      rel="noopener noreferrer"
      className="card-glow group flex flex-col rounded-xl border border-border/60 bg-surface transition-all duration-200 hover:bg-surface-2"
    >
      <div className="flex flex-1 flex-col p-4">
        {/* Top row: accent dot + tags */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              {app.tags[0]}
            </span>
          </div>
          <span className="text-[11px] text-muted/60">
            {app.author}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-foreground">
          {app.title}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-muted-light">
          {app.description}
        </p>

        {/* Footer: tags + arrow */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {app.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}
