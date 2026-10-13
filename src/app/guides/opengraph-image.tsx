import { renderOgImage } from "@/components/landing/og-image";

export const alt = "SpriteLab game dev guides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Game Dev Guides",
    subtitle: "Sprite sheets, pixel art, tiles, Unity, Godot and GameMaker",
  });
}
