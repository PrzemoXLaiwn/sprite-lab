import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Image - SpriteLab | Add Effects to Game Assets",
  description: "Add fire, ice, lightning, magic and other effects to your game sprites. Change colors, materials, and art styles with AI.",
  keywords: ["edit sprites", "add effects", "fire effect", "ice effect", "magic sprite", "game asset editing"],
  openGraph: {
    title: "Edit Game Assets with AI Effects - SpriteLab",
    description: "Transform your sprites with fire, ice, lightning, and magical effects. AI-powered image editing.",
  },
};

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
