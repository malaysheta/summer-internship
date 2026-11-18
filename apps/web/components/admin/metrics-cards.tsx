"use client";

import { FileText, Globe, Layers, Wallet } from "lucide-react";

interface MetricsCardsProps {
  totalDrafts: number;
  draftsByType: Record<string, number>;
  draftsByLanguage: Record<string, number>;
  totalLlmCostThisMonth: number;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  bn: "Bengali",
  pa: "Punjabi",
  ur: "Urdu",
};

export function mapDbDocTypeToLabel(type: string): string {
  const mapping: Record<string, string> = {
    petition: "RTI Application",
    notice: "Legal Notice",
    agreement: "NDA",
    complaint: "Consumer Complaint",
    // Frontend matching types
    rti_application: "RTI Application",
    legal_notice: "Legal Notice",
    nda: "NDA",
    consumer_complaint: "Consumer Complaint",
    cheque_bounce_notice: "Cheque Bounce Notice",
  };
  return mapping[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function MetricsCards({
  totalDrafts,
  draftsByType,
  draftsByLanguage,
  totalLlmCostThisMonth,
}: MetricsCardsProps) {
  const types = Object.entries(draftsByType).sort((a, b) => b[1] - a[1]);
  const languages = Object.entries(draftsByLanguage).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total drafts" value={totalDrafts.toLocaleString()} hint="Across all users" icon={FileText} />
        <StatTile
          label="LLM spend"
          value={CURRENCY_FORMATTER.format(totalLlmCostThisMonth)}
          hint="This month"
          icon={Wallet}
        />
        <StatTile label="Document types" value={String(types.length)} hint="In use" icon={Layers} />
        <StatTile label="Languages" value={String(languages.length)} hint="In use" icon={Globe} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Breakdown
          title="Drafts by document type"
          rows={types.map(([k, v]) => [mapDbDocTypeToLabel(k), v])}
          total={totalDrafts}
          empty="No drafts created yet."
        />
        <Breakdown
          title="Drafts by language"
          rows={languages.map(([k, v]) => [LANGUAGE_LABELS[k] || k, v])}
          total={totalDrafts}
          empty="No drafts created yet."
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <Icon className="size-4 text-zinc-400" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-xs">
      <h2 className="border-b border-zinc-100 px-5 py-3.5 text-sm font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="space-y-3.5 px-5 py-4">
          {rows.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-zinc-700">{label}</span>
                  <span className="tabular-nums text-zinc-500">
                    {count.toLocaleString()} <span className="text-zinc-400">· {pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-zinc-800" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
