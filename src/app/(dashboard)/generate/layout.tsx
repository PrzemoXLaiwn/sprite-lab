import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate Game Assets - SpriteLab | AI Sprite Generator",
  description: "Create stunning game sprites, weapons, armor, characters, and more with AI. Choose from 10+ art styles including pixel art, anime, and dark fantasy.",
  keywords: ["generate sprites", "AI game art", "create game assets", "pixel art generator", "sprite maker"],
  openGraph: {
    title: "Generate Game Assets with AI - SpriteLab",
    description: "Create game-ready sprites in seconds. Weapons, armor, characters, items, and more in any art style.",
    url: "https://www.sprite-lab.com/generate",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/generate",
  },
};

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
