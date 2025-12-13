"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface UpgradeButtonProps {
  plan: "STARTER" | "PRO" | "UNLIMITED";
  variant?: "default" | "outline";
  className?: string;
  children?: React.ReactNode;
}

export function UpgradeButton({
  plan,
  variant = "default",
  className = "",
  children
}: UpgradeButtonProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    // Redirect to custom checkout page
    router.push(`/checkout/${plan.toLowerCase()}`);
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleUpgrade}
    >
      <Zap className="w-4 h-4 mr-2" />
      {children || "Upgrade"}
    </Button>
  );
}
