"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

/** One top bar for the signed-in app (dashboard, intake, settings). */
export function AppHeader() {
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // UI-only hint; /admin re-checks the role server-side.
  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { role?: string } | null) => setIsAdmin(me?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/new", label: t("newDraft") },
    { href: "/settings", label: t("settings") },
    ...(isAdmin ? [{ href: "/admin", label: t("admin") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-5 md:px-10">
        <Wordmark href="/dashboard" />
        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-7 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "label-caps relative py-1 transition-colors duration-[180ms]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  active && "after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-brand"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LanguageSwitcher />
          <button
            onClick={signOut}
            className="label-caps h-9 border border-border px-3.5 text-muted-foreground transition-colors duration-[180ms] hover:border-foreground/40 hover:text-foreground"
          >
            {tCommon("signOut")}
          </button>
        </div>
      </div>
      {/* Mobile: links in a scrollable strip under the bar. */}
      <nav aria-label="Primary" className="flex gap-6 overflow-x-auto border-t border-hairline-soft px-5 md:hidden">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "label-caps shrink-0 border-b-2 py-3",
                active ? "border-brand text-foreground" : "border-transparent text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
