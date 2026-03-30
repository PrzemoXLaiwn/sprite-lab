import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(0,0,0,0.2),inset_0_-1px_0_rgba(255,255,255,0.02)] ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/40 focus-visible:shadow-[0_0_0_3px_rgba(255,107,44,0.1),inset_0_1px_0_rgba(0,0,0,0.2)] focus-visible:bg-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
