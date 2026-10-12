import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/AppShell";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";

/**
 * Pages that belong to the app but must be readable without an account
 * (pricing, community gallery) — search engines and new visitors see them
 * with the public site chrome; signed-in users keep the app frame.
 */
export default async function PublicAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) return <AppShell user={user}>{children}</AppShell>;

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      <SiteNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
