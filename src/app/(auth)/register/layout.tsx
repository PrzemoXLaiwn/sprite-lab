import type { Metadata } from "next";

export const metadata: Metadata = {
  // Sign-in forms aren't search results — keep them out of the index
  robots: { index: false, follow: true },
  // ?redirectTo= / ?ref= variants are one page, not many
  alternates: { canonical: "https://www.sprite-lab.com/register" },
  title: "Sign up free",
  description: "Create your free SpriteLab account and get 10 credits to start generating AI game assets. No credit card required.",
  keywords: ["sign up", "register", "create account", "free game assets", "game developer tools"],
  openGraph: {
    title: "Join SpriteLab - Free AI Game Assets",
    description: "Sign up free and get 10 credits to create game sprites with AI.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
