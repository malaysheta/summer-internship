"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import type { CitationValidityRow } from "@/app/api/admin/evals/lib";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_STYLES: Record<CitationValidityRow["status"], string> = {
  passed: "text-emerald-600 bg-emerald-50",
  rejected: "text-rose-600 bg-rose-50",
  error: "text-amber-600 bg-amber-50",
};

export default function CitationValidityPage() {
  const [runs, setRuns] = useState<CitationValidityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      try {
        const response = await fetch("/api/admin/evals/citations", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? `Request failed (${response.status})`);
        }
        if (!cancelled) setRuns(payload?.runs ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load citation validity runs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRuns();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="text-slate-950">
      <section className="mx-auto flex w-full max-w-none flex-col gap-6">
        <header className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Team F · Evals & Telemetry
          </p>
          <div className="mt-3 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Citation Validity Dashboard
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Every draft&apos;s citation check, newest first: how many cited sections exist in
              PageIndex versus how many were invalid.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
            Loading citation validity runs...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full border-collapse text-left">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 font-medium">Document</th>
                    <th className="px-5 py-4 font-medium">Language</th>
                    <th className="px-5 py-4 font-medium">Citation Validity (%)</th>
                    <th className="px-5 py-4 font-medium">Valid / Total</th>
                    <th className="px-5 py-4 font-medium">Invalid Citations</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {runs.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-500" colSpan={7}>
                        No citation checks yet. Rows appear as drafts are generated.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {DATE_FORMATTER.format(new Date(run.date))}
                        </td>
                        <td className="max-w-xs truncate px-5 py-4">
                          {run.document_id ? (
                            <Link href={`/draft/${run.document_id}`} className="hover:underline">
                              {run.document_title ?? "Untitled"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-4 uppercase">{run.language ?? "—"}</td>
                        <td className="px-5 py-4 font-semibold">
                          {run.validity_pct != null ? `${run.validity_pct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {run.total != null ? `${run.valid} / ${run.total}` : `${run.valid} / —`}
                        </td>
                        <td className="px-5 py-4 text-rose-600">{run.invalid ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[run.status]}`}>
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
