"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Shield, ShieldCheck, ChevronRight } from "lucide-react";
import { checkAdminAccess } from "@/app/(dashboard)/admin/page.actions";

export function AdminNavLink({ className }: { className?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  const checkAccess = useCallback(async () => {
    const result = await checkAdminAccess();
    setIsAdmin(result.isAdmin);
    setIsModerator(result.isModerator);
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Show nothing if not at least moderator
  if (!isAdmin && !isModerator) return null;

  return (
    <>
      {/* Moderator Link - Show for MODERATOR+ */}
      {isModerator && (
        <Link
          href="/moderator"
          className={className}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c084fc]/0 via-[#c084fc]/5 to-[#c084fc]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <ShieldCheck className="relative w-5 h-5 transition-colors group-hover:text-[#c084fc]" />
          <span className="relative flex-1">Moderator</span>
          <ChevronRight className="relative w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
        </Link>
      )}

      {/* Admin Link - Show only for ADMIN+ */}
      {isAdmin && (
        <Link
          href="/admin"
          className={className}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#ff6b6b]/0 via-[#ff6b6b]/5 to-[#ff6b6b]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Shield className="relative w-5 h-5 transition-colors group-hover:text-[#ff6b6b]" />
          <span className="relative flex-1">Admin Panel</span>
          <ChevronRight className="relative w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
        </Link>
      )}
    </>
  );
}
