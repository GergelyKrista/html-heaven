import { ImageResponse } from "next/og";
import { getAppBySlug } from "@/lib/apps";
import { getDB, getLikeCount, getSubmitter } from "@/lib/db";
import { getProfileById } from "@/lib/users";

export const alt = "App on HTML Heaven";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-app OG image — shows the app's title, description, submitter,
// like count. Rendered dynamically on every request, cached at the edge.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getAppBySlug(slug).catch(() => undefined);

  // Default fallback for missing apps
  const title = app?.title || "HTML Heaven";
  const description = app?.description || "An HTML5 app on HTML Heaven";
  const category = app?.tags[0] || "app";

  let likeCount = 0;
  let authorName = app?.author || "HTML Heaven";
  let authorAvatar: string | null = null;

  if (app) {
    try {
      const db = await getDB();
      const [likes, submitterId] = await Promise.all([
        getLikeCount(db, slug),
        getSubmitter(db, slug),
      ]);
      likeCount = likes;
      if (submitterId) {
        const profile = await getProfileById(db, submitterId);
        if (profile) {
          authorName = profile.name;
          // Only use remote avatars (data URLs would bloat the response
          // and ImageResponse needs real URLs it can fetch).
          if (profile.avatar && profile.avatar.startsWith("http")) {
            authorAvatar = profile.avatar;
          }
        }
      }
    } catch {
      // fine — render the card without DB details
    }
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
          padding: "64px 72px",
          background:
            "radial-gradient(1000px 500px at 80% 0%, rgba(224,74,47,0.18), transparent 55%)," +
            "radial-gradient(800px 500px at 0% 100%, rgba(59,130,246,0.15), transparent 55%)," +
            "#0a0a0f",
          color: "#f7f7f8",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* Top row: brand + category pill */}
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
          <div
            style={{
              marginLeft: "auto",
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 18,
              color: "#d9d9de",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontWeight: 600,
            }}
          >
            {category}
          </div>
        </div>

        {/* Title + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 20 }}>
          <div
            style={{
              fontSize: title.length > 30 ? 72 : 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1060,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#c7c7cc",
              maxWidth: 1000,
              display: "-webkit-box",
              overflow: "hidden",
            }}
          >
            {description.length > 180 ? description.slice(0, 177) + "…" : description}
          </div>
        </div>

        {/* Bottom row: author + stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22 }}>
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatar}
              alt=""
              width={52}
              height={52}
              style={{
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.15)",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 52,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                border: "2px solid rgba(255,255,255,0.15)",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              <span>{authorName[0]?.toUpperCase() || "?"}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontSize: 20,
              color: "#c7c7cc",
            }}
          >
            <div style={{ display: "flex", fontWeight: 600, color: "#f7f7f8" }}>{authorName}</div>
            <div style={{ display: "flex", fontSize: 17, color: "#a1a1aa" }}>submitter</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              borderRadius: 999,
              background: "rgba(224,74,47,0.14)",
              border: "1px solid rgba(224,74,47,0.35)",
              color: "#fca58f",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <span>❤ {likeCount} {likeCount === 1 ? "like" : "likes"}</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
