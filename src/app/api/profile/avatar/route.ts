import { NextRequest, NextResponse } from "next/server";
import { auth, githubFieldsFromSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { ensureUserWithHandle } from "@/lib/users";

// Roughly 200KB when base64-encoded (encoding adds ~33% overhead on top
// of the raw image bytes, so we cap on the encoded string length).
const MAX_DATA_URL_BYTES = 280 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Accept a client-compressed data URL and store it as the user's avatar.
 * Client is expected to resize + JPEG-compress to ~50KB before uploading.
 * We validate type and size server-side either way.
 *
 * POST body: { dataUrl: "data:image/jpeg;base64,..." }
 * Or:        { dataUrl: null }   → reset to GitHub avatar
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { dataUrl?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Reset case — clear the custom avatar so GitHub one takes over
  if (body.dataUrl == null) {
    try {
      const db = await getDB();
      const { githubLogin, gh } = githubFieldsFromSession(session.user);
      await ensureUserWithHandle(
        db,
        session.user.email,
        session.user.name || "Anonymous",
        session.user.image || null,
        githubLogin,
        gh
      );
      // Reset to whatever GitHub gave us (session image)
      await db
        .prepare("UPDATE users SET avatar = ? WHERE id = ?")
        .bind(session.user.image || null, session.user.email)
        .run();
      return NextResponse.json({ success: true, avatar: session.user.image || null });
    } catch (error) {
      console.error("Avatar reset error:", error);
      return NextResponse.json({ error: "Failed to reset avatar" }, { status: 500 });
    }
  }

  // Validate data URL format
  const match = /^data:(image\/(jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl);
  if (!match) {
    return NextResponse.json(
      { error: "Avatar must be a base64 data URL for a JPEG / PNG / WebP / GIF image." },
      { status: 400 }
    );
  }
  const mime = match[1];
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  if (body.dataUrl.length > MAX_DATA_URL_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Please pick a smaller picture." },
      { status: 400 }
    );
  }

  try {
    const db = await getDB();
    const { githubLogin, gh } = githubFieldsFromSession(session.user);
    await ensureUserWithHandle(
      db,
      session.user.email,
      session.user.name || "Anonymous",
      session.user.image || null,
      githubLogin,
      gh
    );
    await db
      .prepare("UPDATE users SET avatar = ? WHERE id = ?")
      .bind(body.dataUrl, session.user.email)
      .run();
    return NextResponse.json({ success: true, avatar: body.dataUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to save avatar" }, { status: 500 });
  }
}
