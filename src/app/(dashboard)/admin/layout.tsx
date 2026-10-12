import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - SpriteLab",
  description: "SpriteLab administration dashboard for managing users, credits, and platform settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
