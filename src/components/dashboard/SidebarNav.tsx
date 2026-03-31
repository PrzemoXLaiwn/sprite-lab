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
            className={`sidebar-nav-item group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] ${
              isActive
                ? "text-white font-semibold active"
                : "text-slate-400"
            }`}
          >
            <span className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-sm transition-all duration-200 ${isActive ? "bg-[#F97316] opacity-100" : "opacity-0 group-hover:opacity-60 group-hover:bg-slate-400"}`} />
            <item.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-[#F97316]" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <AdminNavLink className="sidebar-nav-item group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] text-slate-400" />
    </nav>
  );
}
