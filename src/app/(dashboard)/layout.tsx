import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";
import { UserPlanBadge } from "@/components/dashboard/UserPlanBadge";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationPopup } from "@/components/dashboard/NotificationPopup";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, role: true },
  });

  return (
    <div className="min-h-screen bg-[#0B0F19]">

      {/* ═══ SIDEBAR — Desktop ═══════════════════════════════ */}
      <aside className="hidden md:flex md:w-[220px] md:flex-col md:fixed md:inset-y-0 sidebar-panel">
        <div className="flex flex-col flex-1 min-h-0">

          {/* Logo */}
          <div className="flex items-center h-12 px-4 border-b border-[#263046]">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="SpriteLab" width={22} height={22} className="shrink-0" />
              <span className="font-display font-bold text-[13px] tracking-tight text-slate-200 whitespace-nowrap">
                Sprite<span className="text-[#F97316]">Lab</span>
              </span>
            </Link>
          </div>

          {/* Navigation — client component with active state */}
          <SidebarNav />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom — Credits + User */}
          <div className="border-t border-[#263046] p-3 space-y-2">
            <CreditsDisplay />
            <UserPlanBadge email={user.email!} />
          </div>

          {/* Sign out */}
          <div className="px-3 pb-3">
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-md h-8 text-[11px]"
                type="submit"
              >
                <LogOut className="w-3 h-3 mr-2" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* ═══ MOBILE HEADER ═══════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 border-b border-[#263046] bg-[#0B0F19]/95 backdrop-blur-sm z-40">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={22} height={22} />
            <span className="font-display font-bold text-[13px] tracking-tight">
              Sprite<span className="text-[#F97316]">Lab</span>
            </span>
          </Link>
          <MobileMenu
            userEmail={user.email!}
            userPlan={dbUser?.plan || "FREE"}
            userRole={dbUser?.role || "USER"}
          />
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#263046] bg-[#121826]/95 backdrop-blur-sm z-40 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-12">
          {[
            { href: "/generate", label: "Create" },
            { href: "/assets", label: "Assets" },
            { href: "/projects", label: "Projects" },
            { href: "/settings", label: "Settings" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-slate-500 hover:text-slate-300 transition-colors">
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════ */}
      <main className="md:pl-[220px] min-h-screen">
        <div className="pt-12 md:pt-0 pb-16 md:pb-0 bg-[#0B0F19]">
          {children}
        </div>
      </main>

      <NotificationPopup />
      <UpgradeModal />
    </div>
  );
}
