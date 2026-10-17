import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";

/**
 * Pages that belong to the app but must be readable without an account
 * (pricing, community gallery). This public version is static: no session,
 * no cookies, so search engines get it even when the database or the auth
 * service is down. Signed-in users are rewritten by the session proxy to the
 * same pages under /member, which keep the app frame.
 */
export default function PublicAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#131A31] text-white">
      <SiteNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
