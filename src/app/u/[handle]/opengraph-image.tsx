import { ImageResponse } from "next/og";
import { getDB } from "@/lib/db";
import { getProfileByHandle, getProfileStats } from "@/lib/users";

export const alt = "HTML Heaven profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  let name = `@${handle}`;
  let bio: string | null = null;
  let avatar: string | null = null;
  let apps = 0;
  let likes = 0;
  let followers = 0;

  try {
    const db = await getDB();
    const profile = await getProfileByHandle(db, handle);
    if (profile) {
      name = profile.name;
      bio = profile.bio;
      // Only use remote avatars that ImageResponse can fetch
      if (profile.avatar && profile.avatar.startsWith("http")) {
        avatar = profile.avatar;
      }
      const stats = await getProfileStats(db, profile.id);
      apps = stats.appsSubmitted;
      likes = stats.likesReceived;
      followers = stats.followers;
    }
  } catch {
    // Render with fallbacks
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(1000px 500px at 75% 10%, rgba(167,139,250,0.2), transparent 55%)," +
            "radial-gradient(800px 500px at 15% 90%, rgba(224,74,47,0.15), transparent 55%)," +
            "#0a0a0f",
          color: "#f7f7f8",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: "#e04a2f",
              color: "#fff",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#d9d9de" }}>HTML Heaven</div>
        </div>

        {/* Profile block */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={180}
              height={180}
              style={{ borderRadius: 999, border: "4px solid rgba(255,255,255,0.12)" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 180,
                height: 180,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "4px solid rgba(255,255,255,0.12)",
                fontSize: 88,
                fontWeight: 800,
              }}
            >
              {(name[0] || "?").toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 800 }}>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>
              {name}
            </div>
            <div style={{ fontSize: 26, color: "#a1a1aa" }}>@{handle}</div>
            {bio && (
              <div
                style={{
                  fontSize: 24,
                  color: "#c7c7cc",
                  lineHeight: 1.35,
                  marginTop: 8,
                  maxWidth: 780,
                  display: "-webkit-box",
                  overflow: "hidden",
                }}
              >
                {bio.length > 160 ? bio.slice(0, 157) + "…" : bio}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48, fontSize: 22, color: "#c7c7cc" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#fff" }}>{apps}</span>
            <span>apps shipped</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#fff" }}>{likes}</span>
            <span>likes received</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#fff" }}>{followers}</span>
            <span>{followers === 1 ? "follower" : "followers"}</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
