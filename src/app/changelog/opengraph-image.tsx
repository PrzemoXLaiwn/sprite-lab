import { renderOgImage } from "@/components/landing/og-image";

export const alt = "SpriteLab Changelog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "SpriteLab Changelog",
    subtitle: "New features, improvements and fixes",
  });
}
