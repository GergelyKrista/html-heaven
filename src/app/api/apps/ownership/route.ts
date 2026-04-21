import { NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/lib/auth";
import { getDB } from "@/lib/db";

/**
 * Returns the set of app slugs the current user can delete.
 * - Admin: all slugs with submission records + the admin can still delete any
 *   pre-existing apps via the delete API (we don't need to list them all here).
 * - Non-admin: slugs where submissions.user_id matches their email.
 *
 * The shape is deliberately minimal: { slugs: string[], isAdmin: boolean }.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ slugs: [], isAdmin: false });
  }

  const email = session.user.email;
  const admin = isAdminEmail(email);

  try {
    const db = await getDB();
    // Pull slugs this user submitted
    const result = await db
      .prepare("SELECT app_slug FROM submissions WHERE user_id = ?")
      .bind(email)
      .all<{ app_slug: string }>();
    const slugs = result.results.map((r) => r.app_slug);
    return NextResponse.json({ slugs, isAdmin: admin });
  } catch (error) {
    console.error("Ownership lookup error:", error);
    return NextResponse.json({ slugs: [], isAdmin: admin });
  }
}
