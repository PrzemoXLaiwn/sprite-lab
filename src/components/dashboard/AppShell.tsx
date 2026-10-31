import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { NotificationPopup } from "@/components/dashboard/NotificationPopup";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { AppRail } from "@/components/dashboard/AppRail";
import { RelaunchBonus } from "@/components/dashboard/RelaunchBonus";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { GuestSpriteClaim } from "@/components/dashboard/GuestSpriteClaim";
import { DungeonReturn } from "@/components/play/DungeonReturn";
import { prisma } from "@/lib/prisma";
import { NOT_UPLOADED } from "@/lib/upload-marker";
import { relaunchActive, relaunchBonusFor } from "@/config/relaunch";
import { isStPacksEnabled } from "@/config/st-packs";

/**
 * The signed-in app chrome: icon rail, mobile header + bottom nav, global
 * modals. Used by the (dashboard) layout and, for signed-in visitors, by the
 * public pages (pricing, community) so they keep the same app frame.
 */
export async function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, role: true, emailPreferences: true, createdAt: true },
  }).catch(() => null); // database down: the frame still renders
  const prefs = dbUser?.emailPreferences as { relaunchBonusAt?: string } | null;
  // Only accounts that still have a bonus to claim (none for signups after NEW_USER_BONUS_UNTIL)
  const showRelaunchBonus = Boolean(dbUser) && relaunchActive() && !prefs?.relaunchBonusAt && relaunchBonusFor(dbUser!.createdAt).amount > 0;

  // Getting-started checklist: ticks from real activity (3 indexed lookups,
  // once per layout render — layouts don't re-render on client navigation).
  const [firstSprite, firstAnimation, firstProject] = await Promise.all([
    prisma.generation.findFirst({ where: { userId: user.id, NOT: { subcategoryId: "ANIMATION" }, ...NOT_UPLOADED }, select: { id: true } }),
    prisma.generation.findFirst({ where: { userId: user.id, subcategoryId: "ANIMATION" }, select: { id: true } }),
    prisma.project.findFirst({ where: { userId: user.id }, select: { id: true } }),
  ]).catch(() => [null, null, null] as const);

  return (
    <div className="min-h-screen bg-[#131A31]">

      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-[#FFA300] focus:px-3 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-black">
        Skip to content
      </a>

      {/* ═══ ICON RAIL — Desktop ═════════════════════════════ */}
      <AppRail email={user.email!} />

      {/* ═══ MOBILE HEADER ═══════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-12 border-b border-white/[0.06] bg-[#131A31]/95 backdrop-blur-sm z-40">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/" aria-label="SpriteLab home" className="flex min-h-10 items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} />
            <span className="font-display font-bold text-[13px] tracking-tight">
              Sprite<span className="text-[#FFA300]">Lab</span>
            </span>
          </Link>
          <MobileMenu
            userEmail={user.email!}
            userPlan={dbUser?.plan || "FREE"}
            userRole={dbUser?.role || "USER"}
            stPacks={isStPacksEnabled() && (dbUser?.role === "ADMIN" || dbUser?.role === "OWNER")}
          />
        </div>
      </header>

      {/* ═══ MOBILE BOTTOM NAV ═══════════════════════════════ */}
      <MobileBottomNav role={dbUser?.role || "USER"} />

      {/* ═══ MAIN CONTENT ═══════════════════════════════════ */}
      <main id="main-content" className="md:pl-[76px] min-h-screen">
        <div className="app-main pt-12 md:pt-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 bg-[#131A31]">
          {children}
        </div>
      </main>

      <NotificationPopup />
      <GuestSpriteClaim />
      <DungeonReturn />
      <UpgradeModal />
      {showRelaunchBonus && <RelaunchBonus />}
      <GettingStarted done={{ generate: Boolean(firstSprite), animate: Boolean(firstAnimation), project: Boolean(firstProject) }} />
    </div>
  );
}
