import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - SpriteLab | Usage Agreement",
  description: "Read SpriteLab's terms of service. Understand your rights and responsibilities when using our AI game asset generation platform.",
  alternates: { canonical: "https://www.sprite-lab.com/terms" },
  openGraph: {
    title: "Terms of Service - SpriteLab",
    description: "Read SpriteLab's terms of service and usage agreement.",
    url: "https://www.sprite-lab.com/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
