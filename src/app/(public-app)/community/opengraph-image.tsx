import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Community Sprite Gallery — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Community Sprite Gallery",
    subtitle: "Game assets made by SpriteLab users",
  });
}
