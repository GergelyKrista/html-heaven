import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSubmissionPR } from "@/lib/github";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const htmlFile = formData.get("html") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = JSON.parse(formData.get("tags") as string) as string[];

    if (!htmlFile || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (htmlFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    const htmlContent = await htmlFile.text();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const prUrl = await createSubmissionPR({
      slug,
      htmlContent,
      metadata: {
        title,
        description,
        author: session.user.name || "Anonymous",
        tags,
      },
      submitterName: session.user.name || "Anonymous",
      submitterEmail: session.user.email || "",
    });

    return NextResponse.json({ success: true, prUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Submission error:", message);
    return NextResponse.json(
      { error: `Submission failed: ${message}` },
      { status: 500 }
    );
  }
}
