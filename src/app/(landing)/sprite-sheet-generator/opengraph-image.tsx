import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Sprite Sheet Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Sprite Sheet Generator",
    subtitle: "Equal-size frames on a transparent PNG, ready for your engine",
  });
}
