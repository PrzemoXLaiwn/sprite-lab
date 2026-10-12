import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Privacy Policy — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Privacy Policy",
    subtitle: "How SpriteLab handles your data",
  });
}
