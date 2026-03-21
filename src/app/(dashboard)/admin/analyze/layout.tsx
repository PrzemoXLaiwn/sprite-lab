import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze All — Admin | SpriteLab",
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
