import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm Email - SpriteLab",
  description: "Confirm your email address to complete your SpriteLab registration and start creating game assets.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConfirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
