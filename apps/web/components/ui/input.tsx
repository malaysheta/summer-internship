import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "h-10 w-full min-w-0 border border-input bg-transparent px-3 text-sm text-foreground transition-colors duration-[180ms] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:text-foreground placeholder:text-subtle-foreground hover:border-foreground/40 focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
