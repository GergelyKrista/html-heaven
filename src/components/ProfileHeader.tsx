"use client";

import Link from "next/link";
import type { UserProfile, ProfileStats } from "@/lib/users";
import { FollowButton } from "./FollowButton";

interface Props {
  profile: UserProfile;
  stats: ProfileStats;
  isSelf: boolean;
  followedByMe: boolean;
  isSignedIn: boolean;
}

export function ProfileHeader({ profile, stats, isSelf, followedByMe, isSignedIn }: Props) {
  const joined = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div>
      {/* Avatar + name row */}
      <div className="flex items-start gap-5">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            className="h-20 w-20 rounded-full border-2 border-border sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-surface-2 text-2xl font-semibold text-muted sm:h-24 sm:w-24">
            {profile.name[0]?.toUpperCase() || "?"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-xl font-bold leading-tight">{profile.name}</h1>
            {profile.handle && (
              <span className="text-[14px] text-muted">@{profile.handle}</span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-muted-light">
              {profile.bio}
            </p>
          )}

          {/* Meta row: location, website, github, x */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.065a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                </svg>
                {profile.website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                {profile.github}
              </a>
            )}
            {profile.xHandle && (
              <a
                href={`https://x.com/${profile.xHandle}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <span className="font-bold">𝕏</span>
                {profile.xHandle}
              </a>
            )}
            {profile.redditHandle && (
              <a
                href={`https://reddit.com/user/${profile.redditHandle}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12.2c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
                {profile.redditHandle}
              </a>
            )}
            <span>
              Joined {joined}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap gap-5 text-[13px]">
            <span>
              <strong className="text-foreground">{stats.appsSubmitted}</strong>
              <span className="ml-1 text-muted">apps</span>
            </span>
            <span>
              <strong className="text-foreground">{stats.likesReceived}</strong>
              <span className="ml-1 text-muted">likes received</span>
            </span>
            <Link href="#" className="hover:text-foreground">
              <strong className="text-foreground">{stats.followers}</strong>
              <span className="ml-1 text-muted">followers</span>
            </Link>
            <Link href="#" className="hover:text-foreground">
              <strong className="text-foreground">{stats.following}</strong>
              <span className="ml-1 text-muted">following</span>
            </Link>
          </div>
        </div>

        {/* Follow / Edit button */}
        <div className="flex-shrink-0">
          {isSelf ? (
            <Link
              href="/settings/profile"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-4 text-[13px] font-medium text-muted-light transition-colors hover:text-foreground"
            >
              Edit profile
            </Link>
          ) : isSignedIn && profile.handle ? (
            <FollowButton handle={profile.handle} initialFollowing={followedByMe} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
