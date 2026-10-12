import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Sprite Generator for Games — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Sprite Generator for Games",
    subtitle: "Text prompt to transparent PNG · 12 art styles",
  });
}
