import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Pixel Art Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Pixel Art Generator",
    subtitle: "Real pixel grid · limited palette · transparent PNG",
  });
}
