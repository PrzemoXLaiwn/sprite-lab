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
    <nav className="px-2.5 py-3 space-y-0.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
              isActive
                ? "text-white bg-white/8 font-medium"
                : "text-white/45 hover:text-white/80 hover:bg-white/4"
            }`}
          >
            <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-[#FF6B2C]" : ""}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <AdminNavLink className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/45 hover:text-white/80 hover:bg-white/4 transition-colors" />
    </nav>
  );
}
