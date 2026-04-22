import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { ensureUserWithHandle, getProfileById } from "@/lib/users";
import { ProfileEditForm } from "@/components/ProfileEditForm";

export const metadata = {
  title: "Edit profile — HTML Heaven",
};

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/api/auth/signin");

  const db = await getDB();
  const sess = session.user as typeof session.user & { githubLogin?: string };
  await ensureUserWithHandle(
    db,
    session.user.email,
    session.user.name || "Anonymous",
    session.user.image || null,
    sess.githubLogin || null
  );

  const profile = await getProfileById(db, session.user.email);
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
