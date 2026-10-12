import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Sprite Animation Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Sprite Animation Generator",
    subtitle: "Idle, walk, run, attack, jump · sprite sheet + GIF",
  });
}
