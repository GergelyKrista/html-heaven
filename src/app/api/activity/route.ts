import { NextResponse } from "next/server";
import { getDB, getRecentActivity } from "@/lib/db";

// Recent likes/comments/submissions across the site, used by the
// right-rail activity feed on ultrawide screens. Cache briefly at the
// edge so this isn't a fresh D1 query for every viewer.
export async function GET() {
  try {
    const db = await getDB();
    const events = await getRecentActivity(db, 14);
    return NextResponse.json(
      { events },
      {
        headers: {
          // 60s edge cache, 5min stale-while-revalidate. Activity
          // doesn't need to be second-fresh, and slamming D1 on every
          // page load isn't free.
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("activity fetch failed:", err);
    return NextResponse.json({ events: [] });
  }
}
