"use client";

import React from "react";
import { useToastStore } from "@/hooks/use-toast";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.variant === "success";
        const isDestructive = t.variant === "destructive";

        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-in items-start gap-3 border border-l-[3px] border-border bg-popover p-4 text-popover-foreground shadow-[0_32px_64px_rgba(0,0,0,0.55)] duration-300 fade-in slide-in-from-bottom-5",
              isSuccess ? "border-l-success" : isDestructive ? "border-l-destructive" : "border-l-brand"
            )}
            role="alert"
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess ? (
                <CheckCircle2 strokeWidth={1.25} className="size-5 text-success" />
              ) : isDestructive ? (
                <AlertTriangle strokeWidth={1.25} className="size-5 text-destructive" />
              ) : (
                <Info strokeWidth={1.25} className="size-5 text-brand-soft" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {t.title && <h4 className="font-serif text-lg leading-tight">{t.title}</h4>}
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{t.description}</p>
            </div>

            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 p-1 text-subtle-foreground transition-colors duration-[180ms] hover:text-foreground"
              aria-label="Close notification"
            >
              <X strokeWidth={1.25} className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
