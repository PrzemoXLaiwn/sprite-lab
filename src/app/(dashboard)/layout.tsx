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
    // Checkout is not in the proxy protected-path list, so this layout is what
    // anonymous buyers hit. Send them to sign-up with the plan still attached.
    // Any other dashboard route keeps the plain /login redirect.
    const requested = (await headers()).get("x-pathname");
    const next = safeRedirectPath(requested);
    if (isCheckoutReturn(next)) {
      redirect(`/register?next=${encodeURIComponent(next)}`);
    }
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
