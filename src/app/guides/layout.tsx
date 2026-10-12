import { AdSense } from "@/components/ads/AdSense";

/** Content pages: ads for signed-out visitors (see AdSense). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdSense />
    </>
  );
}
