import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Gallery - SpriteLab | Your Generated Game Assets",
  description: "View, download, and manage all your AI-generated game assets. Edit, upscale, remove backgrounds, and create variations.",
  keywords: ["game asset gallery", "sprite collection", "download sprites", "manage game art"],
  openGraph: {
    title: "Your Game Asset Gallery - SpriteLab",
    description: "Access all your generated sprites, weapons, and game assets. Download in high quality.",
    url: "https://www.sprite-lab.com/gallery",
  },
  robots: {
    index: false, // User's personal gallery shouldn't be indexed
    follow: false,
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
