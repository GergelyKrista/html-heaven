import { redirect } from "next/navigation";
import { auth, githubFieldsFromSession, resolveUserId } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { ensureUserWithHandle, getProfileById } from "@/lib/users";
import { ProfileEditForm } from "@/components/ProfileEditForm";

export const metadata = {
  title: "Edit profile — HTML Heaven",
};

export default async function EditProfilePage() {
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
  if (!profile) redirect("/");

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Edit profile</h1>
        <p className="mt-1 text-[13px] text-muted">
          Tell people who you are and what you make.
        </p>
      </div>
      <ProfileEditForm profile={profile} />
    </div>
  );
}
