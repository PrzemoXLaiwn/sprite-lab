import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Game Icon Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Game Icon Generator",
    subtitle: "Item, skill and status icons · transparent PNG",
  });
}
