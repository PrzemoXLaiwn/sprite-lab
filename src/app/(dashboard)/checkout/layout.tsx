import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout - SpriteLab | Complete Your Purchase",
  description: "Complete your SpriteLab purchase securely. Get instant access to credits and premium features for AI game asset generation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
