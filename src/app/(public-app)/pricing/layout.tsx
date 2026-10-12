import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AI Game Asset Plans from £5/month",
  description:
    "Try SpriteLab 3 times without an account and get 10 free credits on signup. Monthly plans start at £5 for 250 credits; credit packs and lifetime deals too.",
  keywords: ["SpriteLab pricing", "AI sprite generator pricing", "game asset generator cost", "pixel art generator plans", "indie game dev tools"],
  alternates: { canonical: "https://www.sprite-lab.com/pricing" },
  openGraph: {
    title: "Pricing — AI Game Asset Plans from £5/month | SpriteLab",
    description: "Try SpriteLab 3 times without an account and get 10 free credits on signup. Monthly plans start at £5 for 250 credits; credit packs and lifetime deals too.",
    url: "https://www.sprite-lab.com/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — AI Game Asset Plans from £5/month | SpriteLab",
    description: "Try SpriteLab 3 times without an account and get 10 free credits on signup. Monthly plans start at £5 for 250 credits; credit packs and lifetime deals too.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
