import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationPopup } from "@/components/dashboard/NotificationPopup";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { AppRail } from "@/components/dashboard/AppRail";
import { RelaunchBonus } from "@/components/dashboard/RelaunchBonus";
import { prisma } from "@/lib/prisma";
import { relaunchActive } from "@/config/relaunch";

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
    select: { plan: true, role: true, emailPreferences: true },
  });
  const prefs = dbUser?.emailPreferences as { relaunchBonusAt?: string } | null;
  const showRelaunchBonus = Boolean(dbUser) && relaunchActive() && !prefs?.relaunchBonusAt;

  return (
    <div className="min-h-screen bg-[#0B0D12]">

      {/* ═══ ICON RAIL — Desktop ═════════════════════════════ */}
      <AppRail email={user.email!} />

      {/* ═══ MOBILE HEADER ═══════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 border-b border-white/[0.06] bg-[#0B0D12]/95 backdrop-blur-sm z-40">
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#0E1016]/95 backdrop-blur-sm z-40 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-12">
          {[
            { href: "/", label: "Home" },
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
      <main className="md:pl-[76px] min-h-screen">
        <div className="pt-12 md:pt-0 pb-16 md:pb-0 bg-[#0B0D12]">
          {children}
        </div>
      </main>

      <NotificationPopup />
      <UpgradeModal />
      {showRelaunchBonus && <RelaunchBonus />}
    </div>
  );
}
