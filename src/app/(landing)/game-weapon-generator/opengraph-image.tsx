import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Game Weapon Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Game Weapon Generator",
    subtitle: "Swords, axes, guns, staffs · transparent PNG",
  });
}
