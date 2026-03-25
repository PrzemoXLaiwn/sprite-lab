import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - SpriteLab | Your Data Protection",
  description: "Learn how SpriteLab protects your privacy and handles your data. Our commitment to transparency and security for game developers.",
  alternates: { canonical: "https://www.sprite-lab.com/privacy" },
  openGraph: {
    title: "Privacy Policy - SpriteLab",
    description: "Learn how SpriteLab protects your privacy and handles your data.",
    url: "https://www.sprite-lab.com/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
