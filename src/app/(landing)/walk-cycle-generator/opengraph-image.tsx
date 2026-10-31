import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Walk Cycle Generator for 2D Games — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Walk Cycle Generator",
    subtitle: "Side-view and 4-direction walks for 2D games",
  });
}
