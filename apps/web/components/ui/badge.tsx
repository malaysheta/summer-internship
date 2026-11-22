import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Square outlined tags: 10px uppercase, tracked (devx pills).
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 text-[10px] font-normal uppercase tracking-[0.18em] whitespace-nowrap transition-colors duration-[180ms] focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand text-white",
        secondary: "border-border bg-secondary text-foreground",
        destructive: "border-destructive/50 text-destructive",
        outline: "border-border text-muted-foreground [a]:hover:text-foreground",
        ghost: "border-transparent text-muted-foreground hover:text-foreground",
        link: "border-transparent px-0 text-brand-soft hover:text-peach",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
