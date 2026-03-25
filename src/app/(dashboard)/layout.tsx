import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Images,
  Settings,
  LogOut,
  Zap,
  Palette,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";
import { AdminNavLink } from "@/components/dashboard/AdminNavLink";
import { UserPlanBadge } from "@/components/dashboard/UserPlanBadge";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationPopup } from "@/components/dashboard/NotificationPopup";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { prisma } from "@/lib/prisma";

const navItems = [
  { href: "/generate", label: "Generate", icon: Zap },
  { href: "/assets", label: "My Assets", icon: Images },
  { href: "/presets", label: "Style Presets", icon: Palette },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
    <div className="min-h-screen bg-[#030305]">
      {/* ══════════════════════════════════════════════════════
          SIDEBAR — Desktop (fixed, 220px)
      ══════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex md:w-[220px] md:flex-col md:fixed md:inset-y-0 border-r border-white/5 bg-[#080810]">
        <div className="flex flex-col flex-1 min-h-0">

          {/* Logo */}
          <div className="flex items-center h-14 px-5">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="SpriteLab"
                width={26}
                height={26}
              />
              <span className="font-display font-bold text-[15px] tracking-tight text-white/90">
                Sprite<span className="text-[#00ff88]">Lab</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2.5 py-3 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            ))}
            <AdminNavLink className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:text-white hover:bg-white/5 transition-colors" />
          </nav>

          {/* Bottom section — Credits + User + Logout */}
          <div className="mt-auto border-t border-white/5 p-3 space-y-3">
            <CreditsDisplay />
            <UserPlanBadge email={user.email!} />
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/30 hover:text-white hover:bg-white/5 rounded-lg h-8 text-xs"
                type="submit"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MOBILE HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-white/5 bg-[#030305]/95 backdrop-blur-xl z-40">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={26} height={26} />
            <span className="font-display font-bold text-sm tracking-tight">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>
          <MobileMenu
            userEmail={user.email!}
            userPlan={dbUser?.plan || "FREE"}
            userRole={dbUser?.role || "USER"}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#080810]/95 backdrop-blur-xl z-40 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-14">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2 px-3 text-white/40 hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════ */}
      <main className="md:pl-[220px] min-h-screen">
        <div className="pt-14 md:pt-0 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      <NotificationPopup />
      <UpgradeModal />
    </div>
  );
}
