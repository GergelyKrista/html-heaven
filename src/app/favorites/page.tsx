import { getAllApps } from "@/lib/apps";
import { FavoritesView } from "@/components/FavoritesView";

export const metadata = {
  title: "Favorites — HTML Heaven",
  description: "Your saved HTML5 apps.",
};

export default function FavoritesPage() {
  const allApps = getAllApps();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Favorites</h1>
        <p className="mt-1 text-[14px] text-muted">
          Saved to this browser only
        </p>
      </div>
      <FavoritesView allApps={allApps} />
    </div>
  );
}
