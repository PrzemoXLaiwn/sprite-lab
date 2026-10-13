import { AdSense } from "@/components/ads/AdSense";

/**
 * Guides: AdSense is mounted here for the whole section, and the component
 * itself decides per page (src/lib/ads-policy.ts) — guide articles with at
 * least 800 words of main text, signed-out visitors only. The /guides index
 * is a list of links and never qualifies.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdSense />
    </>
  );
}
