import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - SpriteLab | Access Your Game Assets",
  description: "Sign in to SpriteLab to access your AI-generated game assets, sprites, and creations. Continue building your game with our powerful tools.",
  openGraph: {
    title: "Login to SpriteLab",
    description: "Access your AI-generated game assets and continue creating.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
