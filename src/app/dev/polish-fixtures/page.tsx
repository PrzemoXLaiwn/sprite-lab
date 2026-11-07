import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolishFixtures } from "./fixtures";

export const metadata: Metadata = {
  title: "UI fixtures",
  robots: { index: false, follow: false },
};

/**
 * Local-only render of the polished settings, share, onboarding and dialog.
 * Production builds hit notFound(), so this never serves fixture UI on the live site
 * and it does not touch auth, Stripe, or the database.
 */
export default function PolishFixturesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PolishFixtures />;
}
