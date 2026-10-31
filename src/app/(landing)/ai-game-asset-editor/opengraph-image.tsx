import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Game Asset Editor — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Game Asset Editor",
    subtitle: "Change a sprite by describing the change",
  });
}
