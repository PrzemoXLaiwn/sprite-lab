import { renderOgImage } from "@/components/landing/og-image";

export const alt = "About SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "About SpriteLab",
    subtitle: "An AI game asset generator for indie developers",
  });
}
