import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage - SpriteLab | Credits & Statistics",
  description: "View your SpriteLab credits, recent generations, and usage statistics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
