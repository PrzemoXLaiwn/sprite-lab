import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/AppShell";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";

/**
 * Signed-in versions of /pricing and /community: the session proxy rewrites
 * those URLs here for signed-in users (the address bar doesn't change), so
 * they keep the app frame while everyone else, search engines included, gets
 * the static public pages. robots.txt disallows /member/.
 */
export default async function MemberAppLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = await createClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    // Auth service unreachable: fall back to the public frame
  }
  if (user) return <AppShell user={user}>{children}</AppShell>;
  return (
    <div className="min-h-screen bg-[#131A31] text-white">
      <SiteNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
