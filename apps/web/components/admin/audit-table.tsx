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
  ok: "border-success/50 text-success",
  timeout: "border-warning/50 text-warning",
  error: "border-destructive/50 text-destructive",
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
        <ScrollText strokeWidth={1.25} className="size-5 text-brand-soft" />
        <p className="mt-4 font-serif text-[30px] leading-tight">No audit logs yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          LLM calls appear here as soon as someone generates a draft. Try clearing the filters if you expected results.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-soft">
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(
                  "label-caps px-4 py-3 text-[10px] whitespace-nowrap text-subtle-foreground",
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {traces.map((trace) => {
            const docType = trace.document?.doc_type || "other";
            const lang = trace.document?.language || "en";
            const status = trace.status?.toLowerCase() ?? "error";

            return (
              <tr key={trace.id} className="transition-colors hover:bg-muted">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {formatTimestamp(trace.created_at)}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3.5 font-serif text-[16px]">
                  {trace.user ? trace.user.display_name || trace.user.email : "Unknown"}
                </td>
                <td className="px-4 py-3">
                  <span className="border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground/85">
                    {trace.agent_name}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-foreground/85">{mapDbDocTypeToLabel(docType)}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {trace.llm_provider}/{trace.model_name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground/85">
                  {(trace.prompt_tokens + trace.completion_tokens).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground/85">
                  {trace.latency_ms >= 1000 ? `${(trace.latency_ms / 1000).toFixed(1)}s` : `${trace.latency_ms}ms`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {CURRENCY_FORMATTER.format(trace.cost_usd)}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-foreground/85">
                  {trace.cited_node_ids?.length > 0 ? trace.cited_node_ids.length : <span className="text-subtle-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-foreground/85">{LANGUAGE_LABELS[lang] || lang}</td>
                <td className="px-4 py-3">
                  <span
                    title={trace.error_msg ?? undefined}
                    className={cn(
                      "label-caps inline-flex items-center border px-2 py-0.5 text-[9px]",
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
