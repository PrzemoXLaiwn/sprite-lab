import { AdSense } from "@/components/ads/AdSense";

/**
 * Comparisons: AdSense is mounted for the section; the component checks the
 * rules in src/lib/ads-policy.ts (signed-out visitors, at least 800 words of
 * main text) before loading anything.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdSense />
    </>
  );
}
