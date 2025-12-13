"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Zap,
  Images,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Crown,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-[#00ff88]" },
  { href: "/generate", label: "Generate", icon: Zap, color: "text-[#00d4ff]", badge: "AI" },
  { href: "/gallery", label: "My Gallery", icon: Images, color: "text-[#c084fc]" },
  { href: "/community", label: "Community", icon: Users, color: "text-[#ffd93d]" },
  { href: "/settings", label: "Settings", icon: Settings, color: "text-white/70" },
];

interface MobileMenuProps {
  userEmail: string;
  userPlan?: string;
  userRole?: string;
}

export function MobileMenu({ userEmail, userPlan = "FREE", userRole = "USER" }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  const getPlanColor = () => {
    switch (userPlan) {
      case "UNLIMITED": return "from-[#ffd93d] to-[#ff6b6b]";
      case "PRO": return "from-[#c084fc] to-[#00d4ff]";
      case "STARTER": return "from-[#00d4ff] to-[#00ff88]";
      default: return "from-white/20 to-white/10";
    }
  };

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="text-white/60 hover:text-white hover:bg-white/5"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-[280px] bg-[#0a0a0f] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <Image src="/logo.png" alt="SpriteLab" width={28} height={28} />
            <span className="font-display font-bold">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getPlanColor()} flex items-center justify-center`}>
              <span className="text-sm font-bold text-white">
                {userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{userEmail}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {userPlan !== "FREE" ? (
                  <Crown className="w-3 h-3 text-[#ffd93d]" />
                ) : (
                  <Sparkles className="w-3 h-3 text-white/40" />
                )}
                <span className={`text-xs font-medium ${
                  userPlan === "UNLIMITED" ? "text-[#ffd93d]" :
                  userPlan === "PRO" ? "text-[#c084fc]" :
                  userPlan === "STARTER" ? "text-[#00d4ff]" :
                  "text-white/40"
                }`}>
                  {userPlan === "UNLIMITED" ? "Titan" :
                   userPlan === "PRO" ? "Apex" :
                   userPlan === "STARTER" ? "Forge" : "Spark"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? item.color : ""}`} />
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
              </Link>
            );
          })}

          {/* Admin Link */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                pathname === "/admin"
                  ? "bg-[#ff4444]/10 text-[#ff4444]"
                  : "text-white/60 hover:text-[#ff4444] hover:bg-[#ff4444]/5"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="flex-1 font-medium">Admin Panel</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0a0a0f] safe-area-bottom">
          <form action="/auth/signout" method="post">
            <Button
              variant="ghost"
              type="submit"
              className="w-full justify-start text-white/40 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
