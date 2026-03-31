import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#171d28] to-[#141821] px-3.5 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(0,0,0,0.2),inset_0_-1px_0_rgba(255,255,255,0.02)] transition-all duration-200 placeholder:text-white/30 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:shadow-[0_0_0_3px_rgba(255,107,44,0.1),0_0_20px_rgba(255,107,44,0.08),inset_0_1px_0_rgba(0,0,0,0.2)] focus-visible:bg-[#1a2030] hover:border-white/[0.14] hover:from-[#1a2030] hover:to-[#161c26] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
