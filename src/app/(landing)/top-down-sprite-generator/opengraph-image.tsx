import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Top-Down Sprite Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Top-Down Sprite Generator",
    subtitle: "4-direction walk · 4 and 8 standing views",
  });
}
