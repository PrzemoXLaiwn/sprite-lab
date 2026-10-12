import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Variations - SpriteLab | Multiple Versions of Your Assets",
  description: "Generate multiple variations of your game sprites. Create color variants, style variations, and alternate designs with AI.",
  keywords: ["sprite variations", "asset variants", "color variations", "style variants", "game asset alternatives"],
  openGraph: {
    title: "Generate Asset Variations - SpriteLab",
    description: "Create multiple versions of your sprites instantly. Perfect for item tiers, color schemes, and more.",
  },
};

export default function VariationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
