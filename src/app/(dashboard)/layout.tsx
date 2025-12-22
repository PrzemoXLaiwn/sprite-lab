import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Images,
  Settings,
  LogOut,
  LayoutDashboard,
  Zap,
  Users,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";
import { AdminNavLink } from "@/components/dashboard/AdminNavLink";
import { UserPlanBadge } from "@/components/dashboard/UserPlanBadge";
import { PromoBanner } from "@/components/dashboard/PromoBanner";
import { PresenceTracker } from "@/components/PresenceTracker";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationPopup } from "@/components/dashboard/NotificationPopup";
import { FeedbackPopup } from "@/components/dashboard/FeedbackPopup";
import { OnboardingOverlay, TutorialOverlay } from "@/components/onboarding/OnboardingProvider";
import { DailyBonusPopup } from "@/components/dashboard/DailyBonusPopup";
import { ReferralPanel } from "@/components/dashboard/ReferralPanel";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { prisma } from "@/lib/prisma";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "group-hover:text-[#00ff88]" },
  { href: "/generate", label: "Generate", icon: Zap, color: "group-hover:text-[#00d4ff]", badge: "AI" },
  { href: "/gallery", label: "My Gallery", icon: Images, color: "group-hover:text-[#c084fc]" },
  { href: "/community", label: "Community", icon: Users, color: "group-hover:text-[#ffd93d]" },
  { href: "/settings", label: "Settings", icon: Settings, color: "group-hover:text-white/70" },
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

  // Get user plan and role for mobile menu
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, role: true },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#030305]">
      {/* Promo Banner - Sticky Top */}
      <PromoBanner />

      <div className="flex flex-1">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/5 via-transparent to-[#c084fc]/5 pointer-events-none" />

        <div className="relative flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image
                  src="/logo.png"
                  alt="SpriteLab"
                  width={32}
                  height={32}
                  className="relative"
                />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Sprite<span className="text-[#00ff88] text-glow">Lab</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200`}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ff88]/0 via-[#00ff88]/5 to-[#00ff88]/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <item.icon className={`relative w-5 h-5 transition-colors ${item.color}`} />
                <span className="relative flex-1">{item.label}</span>

                {item.badge && (
                  <span className="relative px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30">
                    {item.badge}
                  </span>
                )}

                <ChevronRight className="relative w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
              </Link>
            ))}

            {/* Admin Link - Only shows for admins */}
            <AdminNavLink className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200" />
          </nav>

          {/* Credits, Referral & User - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 border-t border-white/5 space-y-4">
            {/* Credits Box */}
            <CreditsDisplay />

            {/* Referral Panel */}
            <ReferralPanel />

            {/* User */}
            <UserPlanBadge email={user.email!} />
          </div>

          {/* Logout - Fixed at bottom with padding for WipBanner */}
          <div className="p-4 pb-16 border-t border-white/5">
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
                type="submit"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-[#030305]/95 backdrop-blur-xl z-40">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image
                src="/logo.png"
                alt="SpriteLab"
                width={32}
                height={32}
                className="relative"
              />
            </div>
            <span className="font-display font-bold tracking-tight">
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

      {/* Mobile Bottom Nav - above WipBanner (h-11 = 44px) */}
      <div className="md:hidden fixed bottom-11 left-0 right-0 border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl z-40">
        <nav className="flex items-center justify-around h-16">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-white/50 hover:text-white transition-all"
            >
              <div className="relative">
                <div className={`absolute inset-0 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity ${
                  item.href === "/generate" ? "bg-[#00d4ff]/30" :
                  item.href === "/gallery" ? "bg-[#c084fc]/30" :
                  item.href === "/community" ? "bg-[#ffd93d]/30" :
                  "bg-[#00ff88]/30"
                }`} />
                <item.icon className="relative w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 bg-[#030305]">
        {/* Subtle background pattern */}
        <div className="fixed inset-0 md:left-64 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00ff88]/3 via-transparent to-transparent" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
        </div>

        <div className="relative pt-16 md:pt-0 pb-32 md:pb-0 min-h-screen">
          {children}
        </div>
      </main>

      {/* Track user presence for online status */}
      <PresenceTracker />

      {/* Notification popup for credit grants and other alerts */}
      <NotificationPopup />

      {/* Daily Login Bonus Popup */}
      <DailyBonusPopup />

      {/* Upgrade Modal when out of credits */}
      <UpgradeModal />

      {/* Periodic Feedback Popup */}
      <FeedbackPopup />

      {/* Onboarding Wizard for new users */}
      <OnboardingOverlay />

      {/* Tutorial for generator (shows after first generation) */}
      <TutorialOverlay />
      </div>
    </div>
  );
}
