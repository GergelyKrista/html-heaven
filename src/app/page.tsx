import Link from "next/link";
import { getAllApps, getFeaturedApps } from "@/lib/apps";
import { AppCarousel } from "@/components/AppCarousel";
import { AppCard } from "@/components/AppCard";

export default async function HomePage() {
  const [featured, allApps] = await Promise.all([getFeaturedApps(), getAllApps()]);
  const appCount = allApps.length;

  return (
    <div>
      {/* Hero — tight, typographic, no gradients */}
      <section className="relative border-b border-border/50">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
          <div className="max-w-2xl">
            <p className="mb-4 text-[13px] font-medium uppercase tracking-widest text-primary">
              {appCount} apps and counting
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.1] tracking-tight">
              Tiny web apps,<br />
              <span className="text-muted">made by people.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-light">
              A collection of self-contained HTML5 tools, games, and creative
              experiments. Everything runs in your browser. Nothing to install.
              All open source.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/browse"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Browse collection
              </Link>
              <Link
                href="/submit"
                className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-[13px] font-semibold text-muted-light transition-colors hover:border-border-light hover:text-foreground"
              >
                Submit yours
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Featured</h2>
            </div>
            <Link
              href="/browse"
              className="text-[13px] font-medium text-muted transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <AppCarousel apps={featured} />
        </section>
      )}

      {/* All apps grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-lg font-semibold">All apps</h2>
          <span className="text-[13px] text-muted">{appCount} apps</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allApps.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      </section>

      {/* CTA — subtle, not salesy */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Built something?</h2>
              <p className="mt-1 text-[14px] text-muted">
                Upload a single HTML file. We review it, you get credit.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex h-10 w-fit items-center rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Submit an app
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
