import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllApps, getAppBySlug } from "@/lib/apps";
import { AppPlayer } from "@/components/AppPlayer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LikeButton } from "@/components/LikeButton";
import { ShareButton } from "@/components/ShareButton";
import { CommentsSection } from "@/components/CommentsSection";

export function generateStaticParams() {
  return getAllApps().map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) return { title: "Not Found — HTML Heaven" };
  return {
    title: `${app.title} — HTML Heaven`,
    description: app.description,
  };
}

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) notFound();

  const dateStr = new Date(app.dateAdded).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2 text-[13px] text-muted">
          <Link href="/browse" className="transition-colors hover:text-foreground">
            Browse
          </Link>
          <span className="text-border-light">/</span>
          <span className="text-foreground">{app.title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <AppPlayer slug={app.slug} title={app.title} />
            <CommentsSection slug={app.slug} />
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-semibold">{app.title}</h1>
              <p className="mt-0.5 text-[13px] text-muted">
                {app.author} &middot; {dateStr}
              </p>
            </div>

            <p className="text-[14px] leading-relaxed text-muted-light">
              {app.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <FavoriteButton slug={app.slug} />
              <LikeButton slug={app.slug} />
              <ShareButton />
            </div>

            <div className="border-t border-border/50 pt-4">
              <a
                href={`https://github.com/GergelyKrista/html-heaven/issues/new?title=Report:+${encodeURIComponent(app.title)}&body=${encodeURIComponent(`Issue with "${app.title}" (/${app.slug}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-muted transition-colors hover:text-foreground"
              >
                Report a problem
              </a>
            </div>
          </div>
        </div>
    </div>
  );
}
