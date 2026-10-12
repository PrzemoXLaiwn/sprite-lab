import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upscale Images - SpriteLab | Enhance Game Asset Quality",
  description: "Upscale your game sprites to higher resolution without losing quality. AI-powered image enhancement for pixel art and detailed sprites.",
  keywords: ["upscale sprites", "enhance resolution", "AI upscaling", "pixel art upscale", "game asset enhancement"],
  openGraph: {
    title: "AI Image Upscaling for Game Assets - SpriteLab",
    description: "Enhance your sprites to higher resolution with AI. Perfect quality for all game engines.",
  },
};

export default function UpscaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
