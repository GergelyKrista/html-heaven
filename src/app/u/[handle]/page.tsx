import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, resolveUserId } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getProfileByHandle, getProfileStats, isFollowing, getUserAppSlugs } from "@/lib/users";
import { getAllAppsSync } from "@/lib/apps";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileAppsSection } from "@/components/ProfileAppsSection";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let name = `@${handle}`;
  let description = `${name} on HTML Heaven — creator profile.`;

  try {
    const db = await getDB();
    const profile = await getProfileByHandle(db, handle);
    if (profile) {
      name = profile.name;
      if (profile.bio) description = profile.bio;
    }
  } catch {
    // fall back to defaults
  }

  const title = `${name} (@${handle}) — HTML Heaven`;
  const url = `https://htmlheaven.com/u/${handle}`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      siteName: "HTML Heaven",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) notFound();

  const db = await getDB();
  const profile = await getProfileByHandle(db, handle);
  if (!profile) notFound();

  const stats = await getProfileStats(db, profile.id);
  const appSlugs = await getUserAppSlugs(db, profile.id);

  // Viewer context
  const session = await auth();
  const viewerId = resolveUserId(session?.user);
  const isSelf = !!viewerId && viewerId === profile.id;
  const followedByMe =
    viewerId && !isSelf
      ? await isFollowing(db, viewerId, profile.id)
      : false;

  // Resolve the user's apps from the manifest (they may have been deleted)
  const allApps = getAllAppsSync();
  const userApps = appSlugs
    .map((slug) => allApps.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <ProfileHeader
        profile={profile}
        stats={stats}
        isSelf={isSelf}
        followedByMe={followedByMe}
        isSignedIn={!!viewerId}
      />
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
          <h2 className="text-[15px] font-semibold">
            Apps{" "}
            <span className="text-[12px] font-normal text-muted">
              ({userApps.length})
            </span>
          </h2>
        </div>
        {userApps.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface py-14 text-center">
            <p className="text-[14px] text-muted">No apps submitted yet.</p>
            {isSelf && (
              <Link
                href="/submit"
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover"
              >
                Submit your first
              </Link>
            )}
          </div>
        ) : (
          <ProfileAppsSection apps={userApps} />
        )}
      </div>
    </div>
  );
}
