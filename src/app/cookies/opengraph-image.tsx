import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Cookie Policy — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Cookie Policy",
    subtitle: "Cookies, consent and advertising",
  });
}
