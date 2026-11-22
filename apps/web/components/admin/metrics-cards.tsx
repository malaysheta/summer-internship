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
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-px border border-border bg-border lg:grid-cols-2">
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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="label-caps text-[10px] text-muted-foreground">{label}</span>
        <Icon strokeWidth={1.25} className="size-4 text-brand-soft" />
      </div>
      <p className="mt-5 font-serif text-[44px] leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2 text-[12px] text-subtle-foreground">{hint}</p>
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
    <section className="bg-background">
      <h2 className="border-b border-hairline-soft px-6 py-4 text-[22px] leading-tight">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-subtle-foreground">{empty}</p>
      ) : (
        <ul className="space-y-4 px-6 py-5">
          {rows.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={label}>
                <div className="flex items-baseline justify-between text-[14px]">
                  <span className="text-foreground/85">{label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {count.toLocaleString()} <span className="text-subtle-foreground">· {pct}%</span>
                  </span>
                </div>
                <div className="mt-2 h-px bg-border">
                  <div className="-mt-px h-[3px] bg-teal" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
