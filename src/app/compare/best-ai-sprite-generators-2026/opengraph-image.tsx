import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Best AI sprite generators in 2026, compared — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Best AI Sprite Generators in 2026",
    subtitle: "SpriteLab, PixelLab, Retro Diffusion, Ludo.ai, Scenario, Leonardo",
  });
}
