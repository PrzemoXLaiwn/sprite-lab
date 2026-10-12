import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Seamless Floor & Wall Tiles with AI — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Seamless Floor & Wall Tiles with AI",
    subtitle: "Tileable pixel-art tiles for 2D games",
  });
}
