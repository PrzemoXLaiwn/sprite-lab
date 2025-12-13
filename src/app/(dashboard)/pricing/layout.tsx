import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - SpriteLab | Affordable AI Game Asset Plans",
  description: "Choose the perfect plan for your game development needs. From free starter credits to unlimited generation. Pay once, create forever with lifetime deals.",
  keywords: ["pricing", "game asset pricing", "AI art pricing", "sprite generator cost", "indie dev tools"],
  openGraph: {
    title: "SpriteLab Pricing - Affordable AI Game Assets",
    description: "Choose your plan: Free starter, monthly subscriptions, or lifetime deals. Perfect for indie developers.",
    url: "https://www.sprite-lab.com/pricing",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
