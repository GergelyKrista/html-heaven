import { getAllApps, getAllTags } from "@/lib/apps";
import { AppGrid } from "@/components/AppGrid";

export const metadata = {
  title: "Browse — HTML Heaven",
  description: "Browse all HTML5 apps in the collection.",
};

export default function BrowsePage() {
  const apps = getAllApps();
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Browse</h1>
        <p className="mt-1 text-[14px] text-muted">
          {apps.length} apps in the collection
        </p>
      </div>
      <AppGrid apps={apps} allTags={tags} />
    </div>
  );
}
