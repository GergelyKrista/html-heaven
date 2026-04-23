import { NextRequest, NextResponse } from "next/server";
import { auth, githubFieldsFromSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { updateProfile, normalizeHandle, ensureUserWithHandle } from "@/lib/users";
import { assertSameOrigin } from "@/lib/security";

const MAX_BIO = 280;
const MAX_FIELD = 100;

function clean(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeUrl(s: string | null): string | null {
  if (!s) return null;
  // If they typed "example.com" without a protocol, prepend https://
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

export async function POST(request: NextRequest) {
  const originGate = assertSameOrigin(request);
  if (originGate) return originGate;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: {
    handle?: string | null;
    bio?: string | null;
    website?: string | null;
    github?: string | null;
    xHandle?: string | null;
    redditHandle?: string | null;
    location?: string | null;
  } = {};

  if ("handle" in body) {
    const raw = clean(body.handle, 25);
    const normalized = normalizeHandle(raw);
    if (raw && !normalized) {
      return NextResponse.json(
        { error: "Handle must be 3-25 chars, lowercase letters/numbers/hyphens." },
        { status: 400 }
      );
    }
    updates.handle = normalized;
  }
  if ("bio" in body) updates.bio = clean(body.bio, MAX_BIO);
  if ("website" in body) updates.website = normalizeUrl(clean(body.website, MAX_FIELD));
  if ("github" in body) updates.github = clean(body.github, MAX_FIELD);
  if ("xHandle" in body) updates.xHandle = clean(body.xHandle, MAX_FIELD);
  if ("redditHandle" in body) updates.redditHandle = clean(body.redditHandle, MAX_FIELD);
  if ("location" in body) updates.location = clean(body.location, MAX_FIELD);

  try {
    const db = await getDB();
    // Make sure user exists first
    const { githubLogin, gh } = githubFieldsFromSession(session.user);
    await ensureUserWithHandle(
      db,
      session.user.email,
      session.user.name || "Anonymous",
      session.user.image || null,
      githubLogin,
      gh
    );

    await updateProfile(db, session.user.email, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Update failed";
    console.error("Profile update error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
