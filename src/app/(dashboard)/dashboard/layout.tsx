import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - SpriteLab | Your Game Asset Hub",
  description: "Your SpriteLab dashboard. View your credits, recent generations, and quick access to all tools.",
  robots: {
    index: false, // Dashboard shouldn't be indexed
    follow: false,
  },
};

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
