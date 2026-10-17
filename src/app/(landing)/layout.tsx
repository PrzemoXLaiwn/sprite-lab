/**
 * Tool landing pages are product pages, not long-form content: no ads here.
 * AdSense runs only on guide articles and comparisons (see AdSense.tsx).
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
