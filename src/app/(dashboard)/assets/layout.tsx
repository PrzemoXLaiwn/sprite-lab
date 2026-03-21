import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Assets - SpriteLab | Your Generated Game Assets",
  description: "View, download, and manage all your AI-generated game assets. Edit, upscale, remove backgrounds, and create variations.",
  keywords: ["game asset gallery", "sprite collection", "download sprites", "manage game art"],
  openGraph: {
    title: "My Assets - SpriteLab",
    description: "Access all your generated sprites, weapons, and game assets. Download in high quality.",
    url: "https://www.sprite-lab.com/assets",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
