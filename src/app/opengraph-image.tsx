import { ImageResponse } from "next/og";
import { getAllApps } from "@/lib/apps";

export const alt = "HTML Heaven — open-source home for HTML5 apps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ────────────────────────────────────────────────────────────
// Dynamic OG image for the home page.
// Rendered server-side on every request but aggressively edge-cached.
// Uses only system-ish fonts (Next's ImageResponse falls back to a
// default sans-serif) so we don't need to ship a font file.
// ────────────────────────────────────────────────────────────

export default async function Image() {
  let appCount = 16;
  try {
    const apps = await getAllApps();
    appCount = apps.length;
  } catch {
    // Fine — use the fallback number
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
            "radial-gradient(1200px 600px at 85% 0%, rgba(224,74,47,0.22), transparent 55%)," +
            "radial-gradient(900px 600px at 10% 100%, rgba(59,130,246,0.18), transparent 55%)," +
            "#0a0a0f",
          color: "#f7f7f8",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* Top row: brand mark + pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "#e04a2f",
              color: "#fff",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>HTML Heaven</div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 18,
              color: "#d9d9de",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: "#22c55e" }} />
            <span>htmlheaven.com</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 960,
            }}
          >
            <span>Tiny web apps,</span>
            <span style={{ color: "#a1a1aa" }}>made by people.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              color: "#c7c7cc",
              maxWidth: 900,
            }}
          >
            Open-source home for self-contained HTML5 apps — games, tools, AI
            skills, creative toys. All running in your browser.
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 22px",
              borderRadius: 14,
              background: "rgba(224,74,47,0.14)",
              border: "1px solid rgba(224,74,47,0.35)",
              color: "#fca58f",
              fontWeight: 700,
            }}
          >
            <span>🚀 {appCount} apps shipped</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#a1a1aa" }}>
            <span>Free · No ads · Community-built</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
