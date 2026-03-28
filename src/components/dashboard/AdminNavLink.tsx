"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Shield, ShieldCheck } from "lucide-react";
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

  if (!isAdmin && !isModerator) return null;

  return (
    <>
      {isModerator && (
        <Link href="/moderator" className={className}>
          <ShieldCheck className="w-[18px] h-[18px]" />
          <span>Moderator</span>
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className={className}>
          <Shield className="w-[18px] h-[18px]" />
          <span>Admin Panel</span>
        </Link>
      )}
    </>
  );
}
