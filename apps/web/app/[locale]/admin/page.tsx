"use client";

import { Link } from "@/i18n/routing";
import { AdminPageHeader } from "@/components/admin/admin-layout";
import { MetricsCards } from "@/components/admin/metrics-cards";
import { useAdminMetrics } from "@/hooks/use-admin-metrics";
import { AlertCircle, ArrowUpRight } from "lucide-react";

const SHORTCUTS = [
  { href: "/admin/analytics", title: "Analytics", body: "Usage trends, conversion and top users." },
  { href: "/admin/audit", title: "Audit logs", body: "Every LLM call with cost, latency and status." },
  { href: "/admin/evals", title: "Model performance", body: "Daily calls, tokens and cost per model." },
];

export default function AdminDashboardPage() {
  const { metrics, loading, error } = useAdminMetrics();

  return (
    <>
      <AdminPageHeader title="Overview" description="Drafts, languages and LLM spend across the platform." />

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading metrics">
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[132px] animate-pulse bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 animate-pulse bg-muted" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 border-l-[3px] border-destructive py-3 pl-4 text-[13px] text-destructive">
          <AlertCircle strokeWidth={1.25} className="size-4 shrink-0" />
          Failed to load metrics: {error}
        </div>
      ) : metrics ? (
        <MetricsCards
          totalDrafts={metrics.totalDrafts}
          draftsByType={metrics.draftsByType}
          draftsByLanguage={metrics.draftsByLanguage}
          totalLlmCostThisMonth={metrics.totalLlmCostThisMonth}
        />
      ) : null}

      <p className="bracket-label mt-14 mb-4">Jump to</p>
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group bg-background p-6 transition-colors duration-[180ms] hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-[22px] leading-tight group-hover:text-peach">{s.title}</span>
              <ArrowUpRight strokeWidth={1.25} className="size-4 text-brand-soft transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{s.body}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
