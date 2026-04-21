import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// Returns { [slug]: count } for all apps that have at least one like.
// Apps with zero likes are omitted (client treats missing as 0).
export async function GET() {
  try {
    const db = await getDB();
    const result = await db
      .prepare("SELECT app_slug, COUNT(*) as count FROM likes GROUP BY app_slug")
      .all<{ app_slug: string; count: number }>();

    const counts: Record<string, number> = {};
    for (const row of result.results) {
      counts[row.app_slug] = row.count;
    }

    return NextResponse.json(
      { counts },
      {
        // Cache for 30s at the edge — like counts don't need to be real-time
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      }
    );
  } catch (error) {
    console.error("Batch likes error:", error);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
