import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-[#e55a1f] text-primary-foreground shadow-[0_1px_4px_rgba(255,107,44,0.2)]",
        secondary:
          "border-white/[0.06] bg-white/[0.05] text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-[#dc2626] text-destructive-foreground shadow-[0_1px_4px_rgba(239,68,68,0.2)]",
        outline:
          "text-foreground border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.04]",
        premium:
          "border-transparent bg-gradient-to-r from-primary via-[#ff7a42] to-[#f59e0b] text-white shadow-[0_1px_6px_rgba(255,107,44,0.25)]",
        success:
          "border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_1px_4px_rgba(16,185,129,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
