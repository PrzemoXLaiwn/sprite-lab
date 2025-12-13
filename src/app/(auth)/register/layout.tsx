import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - SpriteLab | Start Creating Game Assets Free",
  description: "Create your free SpriteLab account and get 10 credits to start generating AI game assets. No credit card required. Join thousands of game developers.",
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
