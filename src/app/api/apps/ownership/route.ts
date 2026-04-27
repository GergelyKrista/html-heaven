import { NextResponse } from "next/server";
import { auth, isAdmin, resolveUserId } from "@/lib/auth";
import { getDB } from "@/lib/db";

/**
 * Returns the set of app slugs the current user can delete.
 * - Admin: all slugs with submission records + the admin can still delete any
 *   pre-existing apps via the delete API (we don't need to list them all here).
 * - Non-admin: slugs where submissions.user_id matches their canonical id.
 *
 * The shape is deliberately minimal: { slugs: string[], isAdmin: boolean }.
 */
export async function GET() {
  const session = await auth();
  const userId = resolveUserId(session?.user);
  const admin = isAdmin(session?.user);
  if (!userId) {
    return NextResponse.json({ slugs: [], isAdmin: false });
  }

  try {
    const db = await getDB();
    // Match against either form of the caller's id — submissions written
    // before the identity fix are keyed by email, newer ones may be
    // keyed by github login. Listing the wider set is safe: the delete
    // endpoint does its own strict ownership check.
    const login = (session?.user as { githubLogin?: string } | undefined)?.githubLogin;
    const ids = [userId, session?.user?.email, login].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    const placeholders = ids.map(() => "?").join(", ");
    const result = await db
      .prepare(`SELECT app_slug FROM submissions WHERE user_id IN (${placeholders})`)
      .bind(...ids)
      .all<{ app_slug: string }>();
    const slugs = result.results.map((r) => r.app_slug);
    return NextResponse.json({ slugs, isAdmin: admin });
  } catch (error) {
    console.error("Ownership lookup error:", error);
    return NextResponse.json({ slugs: [], isAdmin: admin });
  }
}
