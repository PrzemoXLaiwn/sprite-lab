import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remove Background - SpriteLab | Transparent Game Sprites",
  description: "Remove backgrounds from your game assets instantly. Get clean, transparent PNGs ready for any game engine.",
  keywords: ["remove background", "transparent sprite", "PNG transparent", "game asset background removal"],
  openGraph: {
    title: "Remove Background from Game Sprites - SpriteLab",
    description: "Instantly remove backgrounds from sprites. Get clean, game-ready transparent images.",
  },
};

export default function RemoveBgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
