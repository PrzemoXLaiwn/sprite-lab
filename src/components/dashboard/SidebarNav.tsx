"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  Images,
  Palette,
  BarChart3,
  Settings,
  FolderOpen,
} from "lucide-react";
import { AdminNavLink } from "./AdminNavLink";

const navItems = [
  { href: "/generate", label: "Generate", icon: Zap },
  { href: "/assets", label: "My Assets", icon: Images },
  { href: "/presets", label: "Style Presets", icon: Palette },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="px-3 py-3 space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200 border ${
              isActive
                ? "text-white font-semibold border-[#FF6B2C]/40 bg-gradient-to-r from-[#FF6B2C]/18 via-[#FF6B2C]/10 to-transparent shadow-[0_6px_20px_rgba(255,107,44,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-white/70 border-transparent hover:text-white hover:border-white/12 hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-transparent"
            }`}
          >
            <span className={`absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full transition-all duration-200 ${isActive ? "bg-[#FF6B2C] opacity-100" : "opacity-0 group-hover:opacity-60 group-hover:bg-white/40"}`} />
            <item.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-[#FF6B2C]" : "text-white/45 group-hover:text-white/80"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <AdminNavLink className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] text-white/70 border border-transparent hover:text-white hover:border-white/12 hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-transparent transition-all duration-200" />
    </nav>
  );
}
