import { ImageResponse } from "next/og";

// =============================================================================
// Shared Open Graph card for public marketing routes.
// Each route's `opengraph-image.tsx` calls `renderOgImage()` with its own
// title, so social shares (and the twitter:image fallback) show the page
// instead of falling back to nothing — route-level `openGraph` metadata
// otherwise drops the root opengraph-image.
// =============================================================================

export const OG_SIZE = { width: 1200, height: 630 };

const BG = "#0B0D12";
const ACCENT = "#FF8A3D";

export function renderOgImage({ title, subtitle }: { title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BG,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-220px",
            left: "300px",
            width: "700px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,138,61,0.16) 0%, transparent 70%)",
          }}
        />

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 900,
              color: BG,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 700, color: "#ffffff" }}>
            Sprite<span style={{ color: ACCENT }}>Lab</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: title.length > 32 ? "64px" : "76px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: "1040px",
            }}
          >
            {title}
          </div>
          <div style={{ marginTop: "24px", width: "120px", height: "6px", background: ACCENT }} />
        </div>

        {/* Subtitle */}
        <div style={{ display: "flex", fontSize: "28px", color: "#8B93A5" }}>{subtitle}</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
