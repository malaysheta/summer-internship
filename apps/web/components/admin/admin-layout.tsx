"use client";

import { Link, usePathname } from "@/i18n/routing";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { name: "Audit logs", href: "/admin/audit", icon: ScrollText },
    ],
  },
  {
    label: "Evals",
    items: [
      { name: "Model performance", href: "/admin/evals", icon: Gauge },
      { name: "Citation validity", href: "/admin/evals/citation-validity", icon: BadgeCheck },
      { name: "Model comparison", href: "/admin/evals/comparison", icon: GitCompareArrows },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

// Longest matching href wins, so /admin/evals/comparison doesn't also light up /admin/evals.
function activeHref(pathname: string) {
  return ALL_ITEMS.map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/** Sidebar + content frame for every /admin page. Access is enforced by app/[locale]/admin/layout.tsx. */
export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const current = activeHref(usePathname());

  return (
    <div className="flex min-h-screen bg-zinc-50/60 text-zinc-900">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-5">
          <div className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            <ShieldCheck className="size-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Trionic</p>
            <p className="text-[11px] text-zinc-500">Admin console</p>
          </div>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={item.href === current} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-zinc-200 px-3 py-3">
          <NavLink item={{ name: "Settings", href: "/settings", icon: Settings }} active={false} />
          <NavLink item={{ name: "Back to app", href: "/dashboard", icon: ArrowLeft }} active={false} />
          <p className="truncate px-2 pt-2 text-xs text-zinc-500" title={email}>
            {email}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: horizontal tab strip replaces the sidebar */}
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 md:hidden"
        >
          {[...ALL_ITEMS, { name: "Back to app", href: "/dashboard", icon: ArrowLeft }].map((item) => (
            <NavLink key={item.href} item={item} active={item.href === current} compact />
          ))}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, active, compact }: { item: NavItem; active: boolean; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        compact ? "h-8" : "h-9",
        active
          ? "bg-zinc-100 font-medium text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      <Icon className={cn("size-4", active ? "text-zinc-900" : "text-zinc-400")} />
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
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
