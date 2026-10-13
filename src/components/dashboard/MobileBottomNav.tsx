"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wand2, Images, FolderOpen, Settings, Shield, ShieldCheck } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/generate", label: "Create", icon: Wand2 },
  { href: "/assets", label: "Assets", icon: Images },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The tools live under Create, so the tab stays lit while using them.
const CREATE_PATHS = ["/generate", "/animate", "/edit", "/remove-bg", "/upscale", "/variations"];

/** Phone tab bar (hidden from md up, where the icon rail takes over). */
export function MobileBottomNav({ role = "USER" }: { role?: string }) {
  const pathname = usePathname() ?? "";
  // Staff get their panel as a tab (Home stays in the menu)
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const staff = isAdmin ? { href: "/admin", label: "Admin", icon: Shield } : role === "MODERATOR" ? { href: "/moderator", label: "Mod", icon: ShieldCheck } : null;
  const items = staff ? [...ITEMS.slice(1, 4), staff, ITEMS[4]] : ITEMS;
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/generate"
      ? CREATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#19223F]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
      <ul className="flex h-14 items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex flex-1">
              <Link href={item.href} aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-white" : "text-[#9AA1CC] hover:text-white"
                }`}>
                <item.icon className={`h-[18px] w-[18px] ${active ? "text-[#FFA300]" : ""}`} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
