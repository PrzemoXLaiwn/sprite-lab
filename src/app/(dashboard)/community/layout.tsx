import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community - SpriteLab | Share & Discover Game Assets",
  description: "Explore game assets created by the SpriteLab community. Get inspired, share your creations, and connect with other game developers.",
  keywords: ["game dev community", "sprite showcase", "indie dev art", "game asset gallery", "developer community"],
  openGraph: {
    title: "SpriteLab Community - Game Asset Showcase",
    description: "Discover amazing game assets created by indie developers. Share your work and get inspired.",
    url: "https://www.sprite-lab.com/community",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/community",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
