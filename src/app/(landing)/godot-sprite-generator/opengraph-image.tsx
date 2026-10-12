import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI Sprites for Godot 4 — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI Sprites for Godot 4",
    subtitle: "Sprite2D and AnimatedSprite2D-ready sprite sheets",
  });
}
