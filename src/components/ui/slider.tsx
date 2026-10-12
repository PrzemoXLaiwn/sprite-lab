"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#8b5cf6] via-primary to-[#ff7a42] shadow-[0_0_8px_rgba(255,107,44,0.2)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-[#0e1219] shadow-[0_0_0_3px_rgba(255,107,44,0.1),0_2px_4px_rgba(0,0,0,0.3)] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing active:scale-110 hover:border-[#ff7a42] hover:shadow-[0_0_0_4px_rgba(255,107,44,0.15),0_2px_4px_rgba(0,0,0,0.3)] group-hover:shadow-[0_0_0_3px_rgba(255,107,44,0.12),0_2px_4px_rgba(0,0,0,0.3)]" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
