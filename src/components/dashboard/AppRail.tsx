"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Wand2,
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
import { checkAdminAccess } from "@/app/(dashboard)/admin/page.actions";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/generate", label: "Create", icon: Wand2 },
  { href: "/assets", label: "Assets", icon: Images },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/community", label: "Explore", icon: Users },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Narrow icon rail (Meshy / Tripo style). Replaces the 220px sidebar so the
 * workspace gets the width. Credits + account live at the bottom.
 */
export function AppRail({ email }: { email: string }) {
  const pathname = usePathname();
  const [credits, setCredits] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string>("");
  const [roles, setRoles] = useState({ admin: false, moderator: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await fetchUserData();
    if (result.success && result.data) {
      setCredits(result.data.credits);
      setPlanName(result.data.planName);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const interval = setInterval(load, 30_000);
    const onRefresh = () => load();
    window.addEventListener("credits-updated", onRefresh);
    checkAdminAccess().then((r) => setRoles({ admin: r.isAdmin, moderator: r.isModerator })).catch(() => {});
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener("credits-updated", onRefresh);
    };
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const items = [
    ...NAV,
    ...(roles.moderator ? [{ href: "/moderator", label: "Mod", icon: ShieldCheck }] : []),
    ...(roles.admin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
  const low = credits !== null && credits <= 2;

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[76px] flex-col items-center border-r border-white/[0.06] bg-[#0E1016] py-3">
      <Link href="/" className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/[0.05] transition-colors" title="Home" aria-label="SpriteLab home">
        <Image src="/logo.png" alt="SpriteLab" width={26} height={26} />
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-1 px-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex w-full flex-col items-center gap-1 rounded-xl py-2.5 transition-colors ${
                active ? "bg-white/[0.07] text-white" : "text-[#8B93A5] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <item.icon className={`h-[19px] w-[19px] ${active ? "text-[#FF8A3D]" : ""}`} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex w-full flex-col items-center gap-2 px-2">
        <Link
          href="/pricing"
          title={`${credits ?? "…"} credits${planName ? ` · ${planName}` : ""} — get more`}
          className={`flex w-full flex-col items-center gap-0.5 rounded-xl border py-2 transition-colors ${
            low
              ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15"
              : "border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.08] text-[#FFB27A] hover:bg-[#FF8A3D]/[0.14]"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="font-sans tracking-tight text-[14px] font-semibold tabular-nums leading-none text-white">
            {credits === null ? "…" : credits > 9999 ? `${Math.floor(credits / 1000)}k` : credits}
          </span>
          <span className="font-mono text-[9px] leading-none opacity-80">credits</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#E0562A] text-[13px] font-bold text-white ring-2 ring-transparent hover:ring-white/20 transition"
            title={email}
          >
            {email?.[0]?.toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute bottom-0 left-12 w-60 rounded-xl border border-white/[0.08] bg-[#161A22] p-1.5 shadow-2xl">
              <div className="px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-white">{email}</p>
                <p className="text-[11px] text-[#8B93A5]">{planName || "…"} plan · {credits ?? "…"} credits</p>
              </div>
              <Link href="/pricing" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#FFB27A] hover:bg-white/[0.05]">
                <Sparkles className="h-4 w-4" /> Get more credits
              </Link>
              <Link href="/settings" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#C9CFDB] hover:bg-white/[0.05]">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#C9CFDB] hover:bg-white/[0.05]">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
