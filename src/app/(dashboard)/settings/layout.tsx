import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - SpriteLab | Account & Preferences",
  description: "Manage your SpriteLab account settings, subscription, and preferences.",
  robots: {
    index: false, // Settings shouldn't be indexed
    follow: false,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
