"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BracketLabel, Wordmark } from "@/components/brand";

/** Split editorial layout for sign-in / onboarding: brand panel left, form right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const headline = t("landing.headline");
  const split = headline.search(/[.।]\s/);
  const [lead, accent] = split === -1 ? [headline, ""] : [headline.slice(0, split + 1), headline.slice(split + 2)];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative isolate hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_30%_70%,rgba(5,95,89,0.5),transparent_70%),radial-gradient(40%_40%_at_90%_10%,rgba(179,97,65,0.2),transparent_70%)]"
        />
        <span aria-hidden className="absolute inset-y-0 left-14 w-px bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
        <span aria-hidden className="absolute inset-x-0 top-[124px] h-px bg-gradient-to-r from-white/0 via-white/20 to-white/0" />
        <Wordmark className="relative" />
        <div className="relative space-y-6 pl-8">
          <BracketLabel>{t("app.name")}</BracketLabel>
          <p className="font-serif text-[clamp(40px,4.4vw,68px)] leading-[1] tracking-[-0.02em]">
            {lead} <em className="text-peach italic">{accent}</em>
          </p>
          <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">{t("landing.feature1")}.</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6 md:px-12">
          <Wordmark className="lg:invisible" />
          <LanguageSwitcher />
        </div>
        <main className="flex flex-1 items-center px-6 pb-16 md:px-12">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>
        </main>
        <p className="border-t border-hairline-soft px-6 py-4 text-[11px] tracking-[0.04em] text-subtle-foreground md:px-12">
          {t("common.disclaimer")}
        </p>
      </div>
    </div>
  );
}

/** Underlined field: uppercase label over a borderless input (devx contact form). */
export const authInputClass =
  "h-12 border-0 border-b border-input px-0 text-[15px] hover:border-foreground/40 focus-visible:border-brand";
