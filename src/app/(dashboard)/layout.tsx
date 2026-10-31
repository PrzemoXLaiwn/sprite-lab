import { createClient } from "@/lib/supabase/server";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Normally the proxy has already sent an anonymous buyer to sign-in with
    // the checkout URL (plan and offer) attached; this is the fallback when the
    // request slipped through, so it keeps the same destination.
    const requested = (await headers()).get("x-pathname");
    const next = safeRedirectPath(requested);
    if (isCheckoutReturn(next)) {
      redirect(`/login?redirectTo=${encodeURIComponent(next)}`);
    }
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
