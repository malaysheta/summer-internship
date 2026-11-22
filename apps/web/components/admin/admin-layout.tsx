"use client";

import { Link, usePathname } from "@/i18n/routing";
import {
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading, Wordmark, splitAccent } from "@/components/brand";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

// Longest matching href wins, so a nested route lights up only its own item.
function activeHref(pathname: string) {
  return ALL_ITEMS.map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/** Sidebar + content frame for every /admin page. Access is enforced by app/[locale]/admin/layout.tsx. */
export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const current = activeHref(usePathname());

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-popover md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_30%_at_0%_0%,rgba(179,97,65,0.16),transparent_70%),radial-gradient(70%_30%_at_100%_100%,rgba(5,95,89,0.3),transparent_70%)]"
        />
        <div className="relative flex h-[88px] flex-col justify-center gap-1.5 border-b border-border px-6">
          <Wordmark href="/admin" />
          <p className="bracket-label text-[10px]">Admin console</p>
        </div>

        <nav aria-label="Admin" className="relative flex-1 space-y-8 overflow-y-auto py-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="bracket-label mb-2 px-6 text-[10px]">{section.label}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={item.href === current} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-border py-3">
          <NavLink item={{ name: "Settings", href: "/settings", icon: Settings }} active={false} />
          <NavLink item={{ name: "Back to app", href: "/dashboard", icon: ArrowLeft }} active={false} />
          <p className="truncate px-6 pt-3 text-[11px] text-subtle-foreground" title={email}>
            {email}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: horizontal tab strip replaces the sidebar */}
        <nav aria-label="Admin" className="flex gap-6 overflow-x-auto border-b border-border px-5 md:hidden">
          {[...ALL_ITEMS, { name: "Back to app", href: "/dashboard", icon: ArrowLeft }].map((item) => (
            <NavLink key={item.href} item={item} active={item.href === current} compact />
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-10 md:px-10 md:py-14">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, active, compact }: { item: NavItem; active: boolean; compact?: boolean }) {
  const Icon = item.icon;
  if (compact) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "label-caps shrink-0 border-b-2 py-3 whitespace-nowrap",
          active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        {item.name}
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 border-l-[3px] px-6 text-[14px] whitespace-nowrap transition-colors duration-[180ms] outline-none focus-visible:bg-muted",
        active ? "border-brand bg-accent text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon strokeWidth={1.25} className={cn("size-4", active ? "text-brand-soft" : "text-subtle-foreground")} />
      {item.name}
    </Link>
  );
}
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const [lead, accent] = splitAccent(title);
  return (
    <SectionHeading label="Admin" title={lead} accent={accent} subtitle={description} className="mb-10 border-b border-border pb-8">
      {actions}
    </SectionHeading>
  );
}
