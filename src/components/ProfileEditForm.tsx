"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/users";
import { AvatarUploader } from "./AvatarUploader";

export function ProfileEditForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [handle, setHandle] = useState(profile.handle || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [github, setGithub] = useState(profile.github || "");
  const [xHandle, setXHandle] = useState(profile.xHandle || "");
  const [location, setLocation] = useState(profile.location || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim() || null,
          bio: bio.trim() || null,
          website: website.trim() || null,
          github: github.trim().replace(/^@/, "") || null,
          xHandle: xHandle.trim().replace(/^@/, "") || null,
          location: location.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        setError(data.error || "Failed to save.");
      } else {
        setSaved(true);
        if (handle.trim()) {
          // Navigate to the (possibly new) public profile after a brief success flash
          setTimeout(() => router.push(`/u/${handle.trim()}`), 700);
        }
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Profile picture">
        <AvatarUploader current={profile.avatar} name={profile.name} />
      </Field>

      <Field label="Handle" hint="3-25 chars, lowercase letters/numbers/hyphens. Your public URL: /u/<handle>.">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            maxLength={25}
            placeholder="your-handle"
            className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
          />
        </div>
      </Field>

      <Field label="Bio" hint={`${bio.length}/280`}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="A sentence or two about what you build, what you're into, how to reach you..."
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
        />
      </Field>

      <Field label="Website">
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          maxLength={100}
          placeholder="yourdomain.com"
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GitHub handle">
          <input
            type="text"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            maxLength={100}
            placeholder="octocat"
            className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
          />
        </Field>
        <Field label="X / Twitter handle">
          <input
            type="text"
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            maxLength={100}
            placeholder="yourhandle"
            className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Location">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          placeholder="e.g. Budapest, HU"
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
        />
      </Field>

      {error && <p className="text-[13px] text-red-400">{error}</p>}
      {saved && <p className="text-[13px] text-emerald-400">Saved.</p>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
