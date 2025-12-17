import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style Transfer - SpriteLab | Convert Images to Any Art Style",
  description: "Transform any image into pixel art, anime, hand-painted, or other art styles. AI-powered style transfer for game assets.",
  keywords: ["style transfer", "art style conversion", "pixel art converter", "anime style", "image transformation"],
  openGraph: {
    title: "Style Transfer - SpriteLab",
    description: "Convert any image to pixel art, anime, or other game art styles with AI.",
    url: "https://www.sprite-lab.com/generate/style-transfer",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/generate/style-transfer",
  },
};

export default function StyleTransferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
