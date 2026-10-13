import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Contact SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Contact SpriteLab",
    subtitle: "Support, billing, bugs and feedback",
  });
}
