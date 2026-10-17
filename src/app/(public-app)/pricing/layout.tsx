import type { Metadata } from "next";
import { SIGNUP_CREDITS } from "@/config/signup";

const PRICING_TITLE = `SpriteLab Pricing: Plans from £5/month, ${SIGNUP_CREDITS} Free Credits`;
const PRICING_DESCRIPTION = `Start with ${SIGNUP_CREDITS} free credits, no card. Plans from £5 for 250 credits a month, or one-off packs that never expire.`;

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  keywords: ["SpriteLab pricing", "AI sprite generator pricing", "game asset generator cost", "pixel art generator plans", "indie game dev tools"],
  alternates: { canonical: "https://www.sprite-lab.com/pricing" },
  openGraph: {
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    url: "https://www.sprite-lab.com/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
