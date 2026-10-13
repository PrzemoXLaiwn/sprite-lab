import { renderOgImage } from "@/components/landing/og-image";

export const alt = "SpriteLab site map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "SpriteLab site map",
    subtitle: "Every tool, guide and comparison in one place",
  });
}
