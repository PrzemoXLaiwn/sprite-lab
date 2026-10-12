import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Sprites for Unity — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Sprites for Unity",
    subtitle: "Sprite sheets ready to slice by cell size",
  });
}
