"use client";

import { useRef } from "react";
import { useReveal } from "@/hooks/use-reveal";

/** Client wrapper so server pages can opt children into `[data-reveal]` fade-ups. */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
