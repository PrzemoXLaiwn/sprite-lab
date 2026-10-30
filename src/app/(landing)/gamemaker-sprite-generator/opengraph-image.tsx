import { renderOgImage } from "@/components/landing/og-image";

export const alt = "GameMaker Sprite Generator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "GameMaker Sprite Generator",
    subtitle: "Strips named _stripN · transparent PNG",
  });
}
