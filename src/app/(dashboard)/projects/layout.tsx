import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | SpriteLab",
  description: "Organize your game assets into projects with AI-generated folder structure.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
