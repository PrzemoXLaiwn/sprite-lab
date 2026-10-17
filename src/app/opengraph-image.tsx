import { renderOgImage } from "@/components/landing/og-image";

// Default share image. The edge runtime plus `backgroundClip: "text"` made
// this route return a 0-byte PNG, so it uses the same Node renderer as the
// other marketing images. Title and subtitle match the previous card.

export const alt = "SpriteLab — Generate game-ready sprites in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Generate Game Assets Ready in Seconds",
    subtitle: "Pixel art · Dark fantasy · Anime · Transparent PNG · 10 free credits",
  });
}
