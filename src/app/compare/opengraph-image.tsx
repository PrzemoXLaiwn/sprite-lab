import { renderOgImage } from "@/components/landing/og-image";

export const alt = "SpriteLab compared with other AI sprite tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Sprite Tools Compared",
    subtitle: "Honest feature and pricing comparisons from official sources",
  });
}
