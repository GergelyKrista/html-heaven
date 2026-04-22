"use client";

import { useState } from "react";

interface Props {
  handle: string;
  initialFollowing: boolean;
}

export function FollowButton({ handle, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const optimistic = !following;
    setFollowing(optimistic);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(handle)}/follow`, {
        method: "POST",
      });
      const data = (await res.json()) as { following?: boolean; error?: string };
      if (res.ok && typeof data.following === "boolean") {
        setFollowing(data.following);
      } else {
        setFollowing(!optimistic);
      }
    } catch {
      setFollowing(!optimistic);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "border border-border bg-surface text-muted-light hover:border-red-500/30 hover:text-red-400"
          : "bg-primary text-white hover:bg-primary-hover"
      }`}
    >
      {following ? (loading ? "Unfollowing..." : "Following") : (loading ? "Following..." : "Follow")}
    </button>
  );
}
