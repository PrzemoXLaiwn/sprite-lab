import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Terms of Service — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Terms of Service",
    subtitle: "Accounts, credits and your license to generated assets",
  });
}
