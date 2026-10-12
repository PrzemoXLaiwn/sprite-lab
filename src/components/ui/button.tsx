import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[#e55a1f] text-primary-foreground shadow-[0_2px_8px_rgba(255,107,44,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_4px_16px_rgba(255,107,44,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-110 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-b from-destructive to-[#dc2626] text-destructive-foreground shadow-[0_2px_8px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:brightness-110 hover:-translate-y-0.5",
        outline:
          "border border-white/[0.08] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.06] hover:border-primary/30 hover:shadow-[0_0_15px_rgba(255,107,44,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] text-foreground",
        secondary:
          "bg-gradient-to-b from-secondary to-[#161a28] text-secondary-foreground border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.1] hover:bg-gradient-to-b hover:from-[#222640] hover:to-secondary",
        ghost:
          "hover:bg-white/[0.06] hover:text-foreground text-muted-foreground",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-[#ff7a42]",
        premium:
          "bg-gradient-to-r from-primary via-[#ff7a42] to-[#f59e0b] text-white shadow-[0_2px_12px_rgba(255,107,44,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_20px_rgba(255,107,44,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:brightness-110",
        neo:
          "sl-cta rounded-xl text-white",
        subtle:
          "bg-gradient-to-b from-[#171d28] to-[#141821] border border-white/[0.08] text-white/80 hover:text-white hover:border-white/[0.14] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)]",
        glass:
          "backdrop-blur-md bg-white/[0.03] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3.5 text-xs",
        lg: "h-11 rounded-lg px-8 text-sm",
        xl: "h-12 rounded-xl px-10 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
