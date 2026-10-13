import { renderOgImage } from "@/components/landing/og-image";

export const alt = "How SpriteLab works";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "How SpriteLab Works",
    subtitle: "From a sentence to sprites, animations and engine-ready sheets",
  });
}
