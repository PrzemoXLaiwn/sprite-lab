import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Update Password - SpriteLab",
  description: "Set a new password for your SpriteLab account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
