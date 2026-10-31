import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Game Asset Generator for 2D Games — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Game Asset Generator",
    subtitle: "Sprites, tiles, icons and sheets for indie games",
  });
}
