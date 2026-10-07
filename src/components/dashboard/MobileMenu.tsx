"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Wand2,
  Home,
  Images,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
  Shield,
  ShieldCheck,
  Zap,
  LogOut,
  Sparkles,
} from "lucide-react";
import { fetchUserData } from "@/app/(dashboard)/layout.actions";

// Mirrors the desktop AppRail (src/components/dashboard/AppRail.tsx).
const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/generate", label: "Create", icon: Wand2 },
  { href: "/assets", label: "Assets", icon: Images },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/community", label: "Explore", icon: Users },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface MobileMenuProps {
  userEmail: string;
  userPlan?: string;
  userRole?: string;
}

function planLabel(plan: string) {
  if (plan === "UNLIMITED") return "Studio";
  if (plan === "PRO") return "Pro";
  if (plan === "STARTER") return "Starter";
  if (plan === "LIFETIME") return "Lifetime";
  return "Free";
}

export function MobileMenu({ userEmail, userPlan = "FREE", userRole = "USER" }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string>("");
  const pathname = usePathname();

  // Close menu when route changes (adjust state during render instead of in
  // an effect — avoids a cascading re-render).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const loadCredits = useCallback(async () => {
    const result = await fetchUserData();
    if (result.success && result.data) {
      setCredits(result.data.credits);
      setPlanName(result.data.planName);
    }
  }, []);

  const openMenu = () => {
    setIsOpen(true);
    loadCredits();
  };

  // Keep the balance fresh after generations while the menu exists.
  useEffect(() => {
    const onRefresh = () => loadCredits();
    window.addEventListener("credits-updated", onRefresh);
    return () => window.removeEventListener("credits-updated", onRefresh);
  }, [loadCredits]);

  // Prevent body scroll when menu is open; Escape closes it.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";
  const isModerator = isAdmin || userRole === "MODERATOR";

  const items = [
    ...NAV,
    ...(isModerator ? [{ href: "/moderator", label: "Moderator", icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
  const low = credits !== null && credits <= 2;
  const displayPlan = planName || planLabel(userPlan);

  return (
    <>
      {/* Menu Button */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8B93A5] transition-colors hover:bg-white/[0.05] hover:text-white"
        onClick={openMenu}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden
      />

      {/* Slide-out Menu */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[284px] flex-col border-l border-white/[0.06] bg-[#0E1016] transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-white/[0.06] px-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <Image src="/logo.png" alt="SpriteLab" width={22} height={22} />
            <span className="font-display text-[14px] font-semibold tracking-tight text-white">
              Sprite<span className="text-[#FF8A3D]">Lab</span>
            </span>
          </Link>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B93A5] transition-colors hover:bg-white/[0.05] hover:text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#E0562A] text-[13px] font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{userEmail}</p>
              <p className="font-mono text-[11px] text-[#8B93A5]">{displayPlan} plan</p>
            </div>
          </div>

          <Link
            href="/pricing"
            onClick={() => setIsOpen(false)}
            className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
              low
                ? "border-red-400/20 bg-red-500/[0.06] text-red-200 hover:bg-red-500/[0.1]"
                : "border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.08] text-[#FFB27A] hover:bg-[#FF8A3D]/[0.14]"
            }`}
          >
            <Zap className="h-4 w-4 shrink-0" />
            <span className="font-sans tracking-tight text-[16px] font-semibold tabular-nums leading-none text-white">
              {credits === null ? "…" : credits}
            </span>
            <span className="font-mono text-[11px] opacity-80">credits</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Get more
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : "text-[#8B93A5] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <item.icon
                  className={`h-[18px] w-[18px] ${isActive ? "text-[#FF8A3D]" : ""}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#8B93A5] transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
