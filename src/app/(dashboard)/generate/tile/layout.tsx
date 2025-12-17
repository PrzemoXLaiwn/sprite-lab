import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seamless Tile Generator - SpriteLab | Create Tileable Textures",
  description: "Generate perfectly seamless tileable textures for games. Ground, walls, nature, and abstract patterns that repeat without visible seams.",
  keywords: ["seamless tile", "tileable texture", "game texture", "tile generator", "repeating pattern"],
  openGraph: {
    title: "Seamless Tile Generator - SpriteLab",
    description: "Create perfectly tileable textures for your game worlds with AI.",
    url: "https://www.sprite-lab.com/generate/tile",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/generate/tile",
  },
};

export default function TileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
