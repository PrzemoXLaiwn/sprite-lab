/**
 * Ads load only on the guide articles themselves (see guides/[slug]/page.tsx),
 * not on the short guides index.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
