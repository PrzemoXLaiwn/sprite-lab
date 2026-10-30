import { renderOgImage } from "@/components/landing/og-image";

export const alt = "2D Game Asset Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "2D Game Asset Generator",
    subtitle: "Sprites, tiles, icons and sheets for indie games",
  });
}
