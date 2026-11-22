"use client";

import { AdminPageHeader } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import type { CitationValidityRow } from "@/app/api/admin/evals/lib";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_STYLES: Record<CitationValidityRow["status"], string> = {
  passed: "text-success bg-success/10",
  rejected: "text-destructive bg-destructive/10",
  error: "text-warning bg-warning/10",
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
    <div>
      <section className="mx-auto flex w-full max-w-none flex-col gap-6">
        <AdminPageHeader title="Citation validity" description={"Every draft's citation check, newest first: how many cited sections exist in PageIndex versus how many were invalid."} />

        {loading ? (
          <div className="border border-dashed border-border bg-background px-6 py-14 text-center text-sm text-muted-foreground">
            Loading citation validity runs...
          </div>
        ) : error ? (
          <div className="border border-destructive/50 bg-destructive/10 px-6 py-5 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden border border-border bg-background">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full border-collapse text-left">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Date</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Document</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Language</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Citation Validity (%)</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Valid / Total</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Invalid Citations</th>
                    <th className="px-5 py-4 label-caps text-[10px] font-normal text-subtle-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft text-sm text-foreground/85">
                  {runs.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-muted-foreground" colSpan={7}>
                        No citation checks yet. Rows appear as drafts are generated.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-muted">
                        <td className="px-5 py-4 font-medium text-foreground">
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
                        <td className="px-5 py-4 text-destructive">{run.invalid ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className={` px-2 py-1 text-xs font-medium ${STATUS_STYLES[run.status]}`}>
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
