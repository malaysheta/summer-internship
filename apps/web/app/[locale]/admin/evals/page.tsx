"use client";

import { AdminPageHeader } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import type { EvalRunResult } from "@trionic/shared";
import { BudgetTracker } from "@/components/admin/BudgetTracker";


const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function getMetricValue(run: EvalRunResult, metricName: string): number {
  return run.metrics.find((metric) => metric.name === metricName)?.value ?? 0;
}

function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(isoDate));
}

export default function AdminEvalsPage() {
  const [runs, setRuns] = useState<EvalRunResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      try {
        setLoading(true);
        setError(null);
        // Server route: cookie session + admin check + correct agent_traces columns.
        const response = await fetch("/api/admin/evals", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { runs?: EvalRunResult[]; error?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? `Request failed (${response.status})`);
        }

        if (!cancelled) {
          setRuns(Array.isArray(payload?.runs) ? payload.runs : []);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load eval dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRuns = [...runs]
    .sort((left, right) => right.ran_at.localeCompare(left.ran_at) || left.model.localeCompare(right.model));

  return (
    <div>

      <section className="mx-auto flex w-full max-w-none flex-col gap-6">
        <AdminPageHeader title="Model performance" description={"Daily calls, tokens and cost per model across all history, aggregated from agent traces."} />

        {loading ? (
          <div className="border border-dashed border-border bg-background px-6 py-14 text-center text-sm text-muted-foreground">
            Loading eval runs…
          </div>
        ) : error ? (
          <div className="border border-destructive/50 bg-destructive/10 px-6 py-5 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <BudgetTracker
              runs={runs}
              dailyBudgetUsd={5.0}
              alertThresholdPct={100}
            />

            <div className="overflow-hidden border border-border bg-background">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse text-left">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Date</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Model</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Total Calls</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Tokens In</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Tokens Out</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft text-sm text-foreground/85">
                  {visibleRuns.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-muted-foreground" colSpan={6}>
                        No model usage yet. Rows appear once drafts are generated.
                      </td>
                    </tr>
                  ) : (
                    visibleRuns.map((run) => (
                      <tr key={run.run_id} className="hover:bg-muted">
                        <td className="px-5 py-4 font-medium text-foreground">
                          {formatDate(run.ran_at)}
                        </td>
                        <td className="px-5 py-4">{run.model}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_calls"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_tokens_in"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_tokens_out"))}</td>
                        <td className="px-5 py-4">{CURRENCY_FORMATTER.format(getMetricValue(run, "total_cost_usd"))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
