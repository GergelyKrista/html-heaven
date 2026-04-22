import { NextResponse } from "next/server";
import { getDB, getSubmitter, getLikeCount } from "@/lib/db";
import { getProfileById, getProfileStats } from "@/lib/users";

/**
 * Returns the metadata needed for the AppCard preview modal:
 * - submitter profile (handle, name, avatar, bio)
 * - number of apps the submitter has published
 * - number of followers
 * - like count for this specific app
 *
 * Cached at the edge for 30s — these change slowly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const [submitterId, likeCount] = await Promise.all([
      getSubmitter(db, slug),
      getLikeCount(db, slug),
    ]);

    let submitter = null;
    let stats = null;
    if (submitterId) {
      submitter = await getProfileById(db, submitterId);
      if (submitter) {
        stats = await getProfileStats(db, submitterId);
      }
    }

    return NextResponse.json(
      { submitter, stats, likeCount },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("App meta fetch error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
