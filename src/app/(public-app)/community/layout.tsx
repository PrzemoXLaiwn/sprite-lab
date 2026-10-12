import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community — Game Sprites Made with AI by Indie Devs",
  description:
    "Browse game sprites, pixel art and animations made with SpriteLab by indie developers. Find prompt ideas and share your own creations.",
  keywords: ["AI game sprites gallery", "pixel art community", "game asset showcase", "indie game dev community", "sprite gallery"],
  alternates: { canonical: "https://www.sprite-lab.com/community" },
  openGraph: {
    title: "Community — Game Sprites Made with AI by Indie Devs | SpriteLab",
    description: "Browse game sprites, pixel art and animations made with SpriteLab by indie developers. Find prompt ideas and share your own creations.",
    url: "https://www.sprite-lab.com/community",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Community — Game Sprites Made with AI by Indie Devs | SpriteLab",
    description: "Browse game sprites, pixel art and animations made with SpriteLab by indie developers. Find prompt ideas and share your own creations.",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
