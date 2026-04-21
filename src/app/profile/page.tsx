import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { getAllApps } from "@/lib/apps";

export const metadata = {
  title: "Profile — HTML Heaven",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const allApps = await getAllApps();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ProfileView allApps={allApps} />
    </div>
  );
}
