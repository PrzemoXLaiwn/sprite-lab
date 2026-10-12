import { renderOgImage } from "@/components/landing/og-image";

export const alt = "AI RPG Character Creator — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "AI RPG Character Creator",
    subtitle: "Heroes, NPCs and monsters · ready to animate",
  });
}
