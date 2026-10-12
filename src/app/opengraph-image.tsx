import { ImageResponse } from "next/og";

// =============================================================================
// SpriteLab — Default Open Graph image
// =============================================================================
// Generated at request time by Next's ImageResponse helper. Replaces the
// missing /public/og-image.png that the layout's metadata used to point at —
// every social share (Twitter, Discord, Slack, LinkedIn) was unfurling a
// broken image until this landed.
//
// Per-route OG images can be added by dropping an `opengraph-image.tsx`
// (or .png) into that route's folder; this file is the default fallback.
// =============================================================================

export const runtime = "edge";
export const alt = "SpriteLab — Generate game-ready sprites in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0B0F19 0%, #121826 50%, #0B0F19 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow accents */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            right: "-200px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 900,
              color: "#0B0F19",
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Sprite<span style={{ color: "#F97316" }}>Lab</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "84px",
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "24px",
            zIndex: 1,
          }}
        >
          Generate Game Assets
        </div>
        <div
          style={{
            fontSize: "84px",
            fontWeight: 900,
            background: "linear-gradient(90deg, #F97316 0%, #FB923C 100%)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "40px",
            zIndex: 1,
          }}
        >
          Ready in Seconds
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: "28px",
            color: "#94A3B8",
            zIndex: 1,
          }}
        >
          Pixel art · Dark fantasy · Anime · Transparent PNG · 10 free credits
        </div>
      </div>
    ),
    { ...size }
  );
}
