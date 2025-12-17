import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Engine Plugins - SpriteLab | Unity & Godot Integration",
  description: "Download SpriteLab plugins for Unity and Godot. Generate AI game assets directly in your game engine editor.",
  keywords: ["Unity plugin", "Godot addon", "game engine integration", "sprite generator plugin", "asset pipeline"],
  openGraph: {
    title: "Unity & Godot Plugins - SpriteLab",
    description: "Generate AI game assets directly in Unity or Godot with our free plugins.",
    url: "https://www.sprite-lab.com/plugins",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/plugins",
  },
};

export default function PluginsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
