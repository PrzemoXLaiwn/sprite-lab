import { ImageResponse } from "next/og";
import path from "node:path";
import sharp from "sharp";

// Node renderer on purpose. `runtime = "edge"` plus CSS the renderer drops
// (backgroundClip) made this route return a 0-byte PNG.
export const runtime = "nodejs";
export const alt = "SpriteLab — Generate game-ready sprites in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Credits line on the homepage share image.
 * Another PR changes this wording — edit only this constant.
 */
const HOME_OG_CREDITS_SUBTITLE =
  "Pixel art · Dark fantasy · Anime · Transparent PNG · 10 free credits";

const BG = "#131A31";
const ACCENT = "#F5A623";
const INK = "#FFF1E8";
const MUTED = "#C5CBE4";

type Variant = "primary" | "alt";
type Raster = { src: string; width: number; height: number };

function publicFile(rel: string) {
  return path.join(process.cwd(), "public", rel);
}

function checkerRaw(width: number, height: number, cell: number) {
  const buf = Buffer.alloc(width * height * 4);
  const dark = [0x1b, 0x24, 0x46, 255];
  const light = [0x2a, 0x35, 0x5c, 255];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = (((x / cell) | 0) + ((y / cell) | 0)) & 1;
      const c = on ? light : dark;
      const i = (y * width + x) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function asDataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Integer nearest-neighbor scale so pixel art stays crisp inside the OG renderer. */
async function crispTile(rel: string, scale: number, pad: number): Promise<Raster> {
  const meta = await sharp(publicFile(rel)).metadata();
  const w = (meta.width ?? 1) * scale;
  const h = (meta.height ?? 1) * scale;
  const sprite = await sharp(publicFile(rel)).resize(w, h, { kernel: "nearest" }).png().toBuffer();
  const tw = w + pad * 2;
  const th = h + pad * 2;
  const png = await sharp(checkerRaw(tw, th, Math.max(8, scale * 4)), {
    raw: { width: tw, height: th, channels: 4 },
  })
    .composite([{ input: sprite, left: pad, top: pad }])
    .png()
    .toBuffer();
  return { src: asDataUrl(png), width: tw, height: th };
}

/** First `frames` cells of a horizontal sheet, scaled by an integer divisor. */
async function crispSheet(rel: string, frames: number, frame: number, divisor: number, pad = 4): Promise<Raster> {
  const meta = await sharp(publicFile(rel)).metadata();
  const srcH = meta.height ?? frame;
  const cropW = frames * frame;
  const outW = cropW / divisor;
  const outH = srcH / divisor;
  const sheet = await sharp(publicFile(rel))
    .extract({ left: 0, top: 0, width: cropW, height: srcH })
    .resize(outW, outH, { kernel: "nearest" })
    .png()
    .toBuffer();
  const tw = outW + pad * 2;
  const th = outH + pad * 2;
  const png = await sharp(checkerRaw(tw, th, Math.max(8, Math.round(frame / divisor / 2))), {
    raw: { width: tw, height: th, channels: 4 },
  })
    .composite([{ input: sheet, left: pad, top: pad }])
    .png()
    .toBuffer();
  return { src: asDataUrl(png), width: tw, height: th };
}

async function logoImage(px: number): Promise<string> {
  const png = await sharp(publicFile("logo.png"))
    .resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return asDataUrl(png);
}

function SpriteImg({ image }: { image: Raster }) {
  return (
    <img
      alt=""
      src={image.src}
      width={image.width}
      height={image.height}
      style={{ width: image.width, height: image.height, imageRendering: "pixelated" }}
    />
  );
}

function Wordmark({ logo, mark = 52 }: { logo: string; mark?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <img alt="" src={logo} width={mark} height={mark} style={{ width: mark, height: mark }} />
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#ffffff", letterSpacing: -0.4 }}>
        Sprite<span style={{ color: ACCENT }}>Lab</span>
      </div>
    </div>
  );
}

function Headline({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: size, fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: -1.2 }}>
        Type a character.
      </div>
      <div style={{ fontSize: size, fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: -1.2, marginTop: 4 }}>
        Get a sprite sheet.
      </div>
    </div>
  );
}

function Engines({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 600, color: ACCENT }}>
      AI sprite generator for Unity, Godot & GameMaker
    </div>
  );
}

function Credits() {
  return (
    <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: MUTED }}>
      {HOME_OG_CREDITS_SUBTITLE}
    </div>
  );
}

export async function renderHomeOg(variant: Variant = "primary") {
  const logo = await logoImage(variant === "primary" ? 46 : 48);
  const knight = await crispTile("showcase/knight.png", 3, 6);
  const slime = await crispTile("showcase/slime.png", 3, 6);
  const goblin = await crispTile("showcase/goblin-archer.png", 2, 6);
  // Half-size nearest scale: each sheet frame stays on the pixel grid and is large enough to read.
  const sheet = await crispSheet("showcase/sheet-knight-idle.png", 8, 256, 2);

  const glow = (
    <div
      style={{
        position: "absolute",
        top: -200,
        left: variant === "alt" ? 280 : -120,
        width: 640,
        height: 480,
        borderRadius: 320,
        background: "radial-gradient(circle, rgba(245,166,35,0.16) 0%, transparent 68%)",
      }}
    />
  );

  if (variant === "alt") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            background: BG,
            padding: "36px 48px 32px",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
          {glow}
          <Wordmark logo={logo} mark={48} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Headline size={60} />
            <Engines size={26} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <SpriteImg image={knight} />
              <SpriteImg image={slime} />
              <SpriteImg image={goblin} />
            </div>
            <SpriteImg image={sheet} />
          </div>
          <Credits />
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: BG,
            padding: "30px 48px 26px",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
        {glow}
        <Wordmark logo={logo} mark={46} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <Headline size={58} />
          <div style={{ width: 112, height: 6, background: ACCENT }} />
          <Engines size={26} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <SpriteImg image={knight} />
            <SpriteImg image={slime} />
            <SpriteImg image={goblin} />
          </div>
          <SpriteImg image={sheet} />
        </div>
        <div style={{ display: "flex", marginTop: 12 }}>
          <Credits />
        </div>
      </div>
    ),
    { ...size },
  );
}

export default function Image() {
  return renderHomeOg("primary");
}
