import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset Pack Generator - SpriteLab | Generate Themed Asset Sets",
  description: "Generate complete themed sets of game assets with AI. Warrior loadouts, mage essentials, dungeon loot, and more - all matching in style.",
  keywords: ["asset pack", "game asset bundle", "themed sprites", "sprite pack generator", "AI asset pack"],
  openGraph: {
    title: "Asset Pack Generator - SpriteLab",
    description: "Generate complete themed sets of matching game assets with a single click.",
    url: "https://www.sprite-lab.com/generate/asset-pack",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/generate/asset-pack",
  },
};

export default function AssetPackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
