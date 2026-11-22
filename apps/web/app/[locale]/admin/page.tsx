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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[118px] animate-pulse rounded-xl border border-zinc-200 bg-white" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-white" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
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

      <h2 className="mt-10 mb-3 text-sm font-medium text-zinc-900">Jump to</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition-colors hover:border-zinc-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900">{s.title}</span>
              <ArrowUpRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-1 text-sm text-zinc-500">{s.body}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
