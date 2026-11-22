import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// devx editorial buttons: square, uppercase, widely tracked. Primary is terracotta.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent font-sans font-normal uppercase tracking-[0.18em] whitespace-nowrap transition-[background-color,border-color,color,opacity] duration-[180ms] ease-editorial outline-none select-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-black/20 bg-brand text-white hover:bg-brand-hover",
        outline:
          "border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-accent aria-expanded:border-foreground/40 aria-expanded:bg-accent",
        secondary:
          "border-border bg-secondary text-secondary-foreground backdrop-blur-[6px] hover:border-foreground/40 hover:bg-accent aria-expanded:bg-accent",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
        destructive:
          "border-destructive/40 bg-transparent text-destructive hover:border-destructive hover:bg-destructive/10",
        link: "h-auto! px-0! text-brand-soft hover:text-peach",
      },
      size: {
        default: "h-10 px-5 text-[11px]",
        xs: "h-7 gap-1.5 px-2.5 text-[10px] tracking-[0.14em] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3.5 text-[10px]",
        lg: "h-12 px-6 text-[12px]",
        icon: "size-10 tracking-normal",
        "icon-xs": "size-7 tracking-normal [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 tracking-normal",
        "icon-lg": "size-12 tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      suppressHydrationWarning
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
