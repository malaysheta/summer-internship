"use client";

import type { AuditTrace } from "@/hooks/use-audit-trails";
import { ScrollText } from "lucide-react";
import { LANGUAGE_LABELS, mapDbDocTypeToLabel } from "./metrics-cards";
import { cn } from "@/lib/utils";

interface AuditTableProps {
  traces: AuditTrace[];
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
});

const STATUS_STYLES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  timeout: "bg-amber-50 text-amber-700 ring-amber-600/20",
  error: "bg-red-50 text-red-700 ring-red-600/20",
};

const COLUMNS: { label: string; align?: "right" | "center" }[] = [
  { label: "Time" },
  { label: "User" },
  { label: "Agent" },
  { label: "Doc type" },
  { label: "Model" },
  { label: "Tokens", align: "right" },
  { label: "Latency", align: "right" },
  { label: "Cost", align: "right" },
  { label: "Citations", align: "center" },
  { label: "Language" },
  { label: "Status" },
];

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AuditTable({ traces }: AuditTableProps) {
  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
          <ScrollText className="size-5 text-zinc-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-900">No audit logs yet</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          LLM calls appear here as soon as someone generates a draft. Try clearing the filters if you expected results.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100">
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-xs font-medium whitespace-nowrap text-zinc-500",
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {traces.map((trace) => {
            const docType = trace.document?.doc_type || "other";
            const lang = trace.document?.language || "en";
            const status = trace.status?.toLowerCase() ?? "error";

            return (
              <tr key={trace.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-500">
                  {formatTimestamp(trace.created_at)}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 font-medium text-zinc-900">
                  {trace.user ? trace.user.display_name || trace.user.email : "Unknown"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                    {trace.agent_name}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{mapDbDocTypeToLabel(docType)}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-600">
                  {trace.llm_provider}/{trace.model_name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                  {(trace.prompt_tokens + trace.completion_tokens).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                  {trace.latency_ms >= 1000 ? `${(trace.latency_ms / 1000).toFixed(1)}s` : `${trace.latency_ms}ms`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                  {CURRENCY_FORMATTER.format(trace.cost_usd)}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-700">
                  {trace.cited_node_ids?.length > 0 ? trace.cited_node_ids.length : <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3 text-zinc-700">{LANGUAGE_LABELS[lang] || lang}</td>
                <td className="px-4 py-3">
                  <span
                    title={trace.error_msg ?? undefined}
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
                      STATUS_STYLES[status] ?? STATUS_STYLES.error,
                    )}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
