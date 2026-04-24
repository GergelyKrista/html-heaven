import { redirect } from "next/navigation";
import { auth, githubFieldsFromSession, resolveUserId } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { ensureUserWithHandle, getProfileById } from "@/lib/users";

/**
 * The user's own profile. We redirect to /u/<handle> so there's one
 * canonical public URL per user. If the user has no handle yet (first
 * visit after sign-in), we auto-claim one from their GitHub login;
 * if that still fails, send them to /settings/profile to pick one.
 */
export default async function ProfilePage() {
  const session = await auth();
  const userId = resolveUserId(session?.user);
  if (!session?.user || !userId) redirect("/api/auth/signin");

  const db = await getDB();
  const { githubLogin, gh } = githubFieldsFromSession(session.user);
  await ensureUserWithHandle(
    db,
    userId,
    session.user.name || "Anonymous",
    session.user.image || null,
    githubLogin,
    gh
  );

  const profile = await getProfileById(db, userId);
  if (profile?.handle) {
    redirect(`/u/${profile.handle}`);
  }
  redirect("/settings/profile");
}
