"use client";

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
    <div className="text-slate-950">

      <section className="mx-auto flex w-full max-w-none flex-col gap-6">
        <header className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Team F · Evals & Telemetry
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Per-LLM Evaluation Dashboard
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Daily calls, tokens and cost per model across all history, aggregated from agent traces.
              </p>
            </div>

          </div>
        </header>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
            Loading eval runs…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : (
          <>
            <BudgetTracker
              runs={runs}
              dailyBudgetUsd={5.0}
              alertThresholdPct={100}
            />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse text-left">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 font-medium">Model</th>
                    <th className="px-5 py-4 font-medium">Total Calls</th>
                    <th className="px-5 py-4 font-medium">Tokens In</th>
                    <th className="px-5 py-4 font-medium">Tokens Out</th>
                    <th className="px-5 py-4 font-medium">Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {visibleRuns.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-500" colSpan={6}>
                        No model usage yet. Rows appear once drafts are generated.
                      </td>
                    </tr>
                  ) : (
                    visibleRuns.map((run) => (
                      <tr key={run.run_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-medium text-slate-900">
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
