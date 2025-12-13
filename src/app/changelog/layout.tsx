import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog - SpriteLab | Latest Updates & Features",
  description: "Stay up to date with SpriteLab's latest features, improvements, and bug fixes. See what's new in our AI game asset generator.",
  keywords: ["changelog", "updates", "new features", "SpriteLab news", "release notes"],
  openGraph: {
    title: "Changelog - SpriteLab Updates",
    description: "See the latest features and improvements in SpriteLab.",
  },
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
