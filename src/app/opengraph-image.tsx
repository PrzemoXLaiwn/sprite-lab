import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Node renderer on purpose. The edge runtime plus `backgroundClip` returned a
// 0-byte PNG. Same ImageResponse path as `renderOgImage`, without that CSS.
export const runtime = "nodejs";
export const alt = "SpriteLab — Generate game-ready sprites in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Credits line on the homepage share image.
 * Another PR changes this wording — edit only this constant.
 * After the rebase onto PR #6 this should read from SIGNUP_FREE_CREDITS.
 */
const HOME_OG_CREDITS_SUBTITLE =
  "Pixel art · Dark fantasy · Anime · Transparent PNG · 10 free credits";

const BG = "#131A31";
const ACCENT = "#FFA300";
const INK = "#FFF1E8";
const MUTED = "#9AA1CC";

const FONT_DIR = path.join(process.cwd(), "src/lib/og/fonts");

function fontFile(name: string) {
  return readFile(path.join(FONT_DIR, name));
}

export default async function Image() {
  const [tektur, atkinson, atkinsonMedium, logo] = await Promise.all([
    fontFile("Tektur-600.ttf"),
    fontFile("Atkinson-400.ttf"),
    fontFile("Atkinson-500.ttf"),
    readFile(path.join(process.cwd(), "public/logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 84px 64px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -80,
            width: 720,
            height: 520,
            borderRadius: 360,
            background: "radial-gradient(circle, rgba(255,163,0,0.16) 0%, transparent 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 8,
            height: "100%",
            background: ACCENT,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img alt="" src={logoSrc} width={64} height={64} style={{ width: 64, height: 64 }} />
          <div
            style={{
              display: "flex",
              fontFamily: "Tektur",
              fontSize: 40,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: -0.5,
            }}
          >
            Sprite<span style={{ color: ACCENT }}>Lab</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Tektur",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -1.5,
              color: INK,
            }}
          >
            Type a character.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Tektur",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -1.5,
              color: INK,
              marginTop: 10,
            }}
          >
            Get a sprite sheet.
          </div>
          <div style={{ width: 120, height: 6, background: ACCENT, marginTop: 28 }} />
          <div
            style={{
              display: "flex",
              fontFamily: "Atkinson Hyperlegible Next",
              fontSize: 30,
              fontWeight: 500,
              color: ACCENT,
              marginTop: 22,
            }}
          >
            AI sprite generator for Unity, Godot & GameMaker
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Atkinson Hyperlegible Next",
            fontSize: 26,
            fontWeight: 400,
            color: MUTED,
          }}
        >
          {HOME_OG_CREDITS_SUBTITLE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Tektur", data: tektur, weight: 600, style: "normal" },
        { name: "Atkinson Hyperlegible Next", data: atkinson, weight: 400, style: "normal" },
        { name: "Atkinson Hyperlegible Next", data: atkinsonMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
