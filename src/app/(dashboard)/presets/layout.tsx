import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style Presets - SpriteLab | Consistent Asset Generation",
  description: "Create and manage style presets for consistent game asset generation across your project.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PresetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
