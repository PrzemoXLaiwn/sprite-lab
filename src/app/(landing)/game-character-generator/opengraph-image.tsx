import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Character Sprite Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Character Sprite Generator",
    subtitle: "A hero, enemies and NPCs in one style",
  });
}
