import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Tileset Generator — Seamless Game Tiles — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Tileset Generator",
    subtitle: "Seamless floors and walls for 2D games",
  });
}
