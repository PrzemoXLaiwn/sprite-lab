import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";

/** Public chrome for /privacy, /terms, /cookies and /refunds. */
export function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#131A31] text-[#FFF1E8]">
      <SiteNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
