import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderator Panel | SpriteLab",
  description: "Moderate community content and handle reports",
};

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
