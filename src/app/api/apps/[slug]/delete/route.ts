import { NextRequest, NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/lib/auth";
import { getDB, getSubmitter, markAppDeleted } from "@/lib/db";
import { createDeletePR } from "@/lib/github";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const userEmail = session.user.email;
  const userName = session.user.name || "Anonymous";
  const admin = isAdminEmail(userEmail);

  // Permission check:
  // - Admin can delete anything
  // - Otherwise, user must be the original submitter (must have a row in submissions)
  //   Apps with no submission record (pre-existing imports) can only be deleted by admin.
  const db = await getDB();
  if (!admin) {
    const submitter = await getSubmitter(db, slug);
    if (!submitter) {
      return NextResponse.json(
        { error: "Only the site admin can delete this app." },
        { status: 403 }
      );
    }
    if (submitter.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only delete apps you submitted." },
        { status: 403 }
      );
    }
  }

  // Parse optional reason from body
  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: string };
    if (typeof body.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 200);
    }
  } catch {
    // No body or malformed — that's fine
  }

  try {
    // Create the delete PR. Admin deletions auto-merge so the files are
    // removed from the repo immediately.
    const result = await createDeletePR({
      slug,
      deletedBy: userEmail,
      deletedByName: userName,
      reason,
      autoMerge: admin,
    });

    // Mark as deleted in D1 for instant UI hiding (bridges the ~90s
    // between merge and Cloudflare redeploy). Non-admin deletions stay
    // hidden until the PR is reviewed and merged.
    await markAppDeleted(db, slug, userEmail, reason);

    return NextResponse.json({
      success: true,
      autoMerged: result.autoMerged,
      prUrl: result.prUrl,
    });
  } catch (error) {
    console.error("Delete error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Delete failed. Please try again later." },
      { status: 500 }
    );
  }
}
