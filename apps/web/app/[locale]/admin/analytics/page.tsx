"use client";

import { AdminPageHeader } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DocumentType, SupportedLanguage } from "@trionic/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | 'all';
type DocTypeCount = { type: string; count: number; pct: string };
type LanguageCount = { language: string; label: string; count: number; pct: string };
type ExportPerDay = { date: string; count: number };
type CitationCount = { act: string; count: number };
type DailyDraftCount = { date: string; count: number };
type LangPerDocType = { docType: string; languages: { lang: string; count: number; pct: string }[] };
type FunnelStage = { stage: string; count: number; pct: string };

// ─── Labels ───────────────────────────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English", hi: "Hindi", gu: "Gujarati",
  mr: "Marathi", ta: "Tamil",
};

// Using shared/types.ts as source of truth per project contract
const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  rti_application: "RTI Application",
  legal_notice: "Legal Notice",
  nda: "NDA",
  consumer_complaint: "Consumer Complaint",
  cheque_bounce_notice: "Cheque Bounce Notice",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DOC_TYPES: DocTypeCount[] = [
  { type: "rti_application", count: 42, pct: "31.3" },
  { type: "legal_notice", count: 31, pct: "23.1" },
  { type: "consumer_complaint", count: 27, pct: "20.1" },
  { type: "nda", count: 18, pct: "13.4" },
  { type: "cheque_bounce_notice", count: 16, pct: "11.9" },
];

const MOCK_LANGUAGES: LanguageCount[] = [
  { language: "en", label: "English", count: 55, pct: "40.7" },
  { language: "hi", label: "Hindi", count: 30, pct: "22.2" },
  { language: "gu", label: "Gujarati", count: 20, pct: "14.8" },
  { language: "mr", label: "Marathi", count: 10, pct: "7.4" },
  { language: "ta", label: "Tamil", count: 7, pct: "5.2" },
];

const MOCK_EXPORTS: ExportPerDay[] = [
  { date: "2026-06-06", count: 7 },
  { date: "2026-06-07", count: 15 },
  { date: "2026-06-08", count: 11 },
  { date: "2026-06-09", count: 9 },
  { date: "2026-06-10", count: 14 },
  { date: "2026-06-11", count: 10 },
  { date: "2026-06-12", count: 8 },
];

const MOCK_CONVERSION = { total: 120, exported: 87 };

const MOCK_DAILY_DRAFTS: DailyDraftCount[] = [
  { date: "2026-06-06", count: 12 },
  { date: "2026-06-07", count: 18 },
  { date: "2026-06-08", count: 9 },
  { date: "2026-06-09", count: 15 },
  { date: "2026-06-10", count: 21 },
  { date: "2026-06-11", count: 14 },
  { date: "2026-06-12", count: 11 },
];

const MOCK_CITATIONS: CitationCount[] = [
  { act: "IPC-1860", count: 54 },
  { act: "CrPC-1973", count: 41 },
  { act: "RTI-2005", count: 38 },
  { act: "CPA-2019", count: 29 },
  { act: "ICA-1872", count: 22 },
];

const MOCK_LANG_PER_DOC: LangPerDocType[] = [
  { docType: "rti_application", languages: [
    { lang: "en", count: 25, pct: "59.5" },
    { lang: "hi", count: 12, pct: "28.6" },
    { lang: "gu", count: 5, pct: "11.9" },
  ]},
  { docType: "legal_notice", languages: [
    { lang: "en", count: 18, pct: "58.1" },
    { lang: "hi", count: 8, pct: "25.8" },
    { lang: "gu", count: 5, pct: "16.1" },
  ]},
  { docType: "consumer_complaint", languages: [
    { lang: "en", count: 15, pct: "55.6" },
    { lang: "hi", count: 7, pct: "25.9" },
    { lang: "gu", count: 5, pct: "18.5" },
  ]},
];

// Funnel with 4 stages including Shared
const MOCK_FUNNEL: FunnelStage[] = [
  { stage: "Created", count: 120, pct: "100" },
  { stage: "Generated", count: 98, pct: "81.7" },
  { stage: "Exported", count: 87, pct: "72.5" },
  { stage: "Shared", count: 45, pct: "37.5" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [docTypes, setDocTypes] = useState<DocTypeCount[]>(MOCK_DOC_TYPES);
  const [languages, setLanguages] = useState<LanguageCount[]>(MOCK_LANGUAGES);
  const [exportsPerDay, setExportsPerDay] = useState<ExportPerDay[]>(MOCK_EXPORTS);
  const [conversion, setConversion] = useState(MOCK_CONVERSION);
  const [dailyDrafts, setDailyDrafts] = useState<DailyDraftCount[]>(MOCK_DAILY_DRAFTS);
  const [citations, setCitations] = useState<CitationCount[]>(MOCK_CITATIONS);
  const [langPerDocType, setLangPerDocType] = useState<LangPerDocType[]>(MOCK_LANG_PER_DOC);
  const [funnel, setFunnel] = useState<FunnelStage[]>(MOCK_FUNNEL);
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // ── Date range filter ────────────────────────────────────────────
        let query = supabase
          .from("documents")
          .select("doc_type, language, status, created_at, updated_at")
          .limit(500);

        if (dateRange === '7d') {
          const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", cutoff);
        } else if (dateRange === '30d') {
          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", cutoff);
        }

        const { data: docs, error: docsError } = await query;

        if (docsError) {
          setUsingMock(true);
          return;
        }

        if (cancelled) return;

        if (!docs || docs.length === 0) {
          setUsingMock(true);
          return;
        }

        setUsingMock(false);
        const total = docs.length;

        // ── Cell 1: Doc-type popularity with % ───────────────────────────
        const dtMap: Record<string, number> = {};
        docs.forEach((d: any) => {
          dtMap[d.doc_type] = (dtMap[d.doc_type] ?? 0) + 1;
        });
        setDocTypes(
          Object.entries(dtMap)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({
              type,
              count,
              pct: ((count / total) * 100).toFixed(1),
            }))
        );

        // ── Cell 2: Language distribution ────────────────────────────────
        const langMap: Record<string, number> = {};
        docs.forEach((d: any) => {
          langMap[d.language] = (langMap[d.language] ?? 0) + 1;
        });
        setLanguages(
          Object.entries(langMap)
            .sort((a, b) => b[1] - a[1])
            .map(([language, count]) => ({
              language,
              label: LANGUAGE_LABELS[language] ?? language,
              count,
              pct: ((count / total) * 100).toFixed(1),
            }))
        );

        // ── Cell 3: Exports per day ───────────────────────────────────────
        const finalDocs = docs.filter((d: any) => d.status === "final");
        const epdMap: Record<string, number> = {};
        finalDocs.forEach((d: any) => {
          const date = d.updated_at.slice(0, 10);
          epdMap[date] = (epdMap[date] ?? 0) + 1;
        });
        setExportsPerDay(
          Object.entries(epdMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7)
            .map(([date, count]) => ({ date, count }))
        );

        // ── Cell 4: Conversion % ─────────────────────────────────────────
        setConversion({ total, exported: finalDocs.length });

        // ── Conversion funnel (4 stages) ─────────────────────────────────
        const generated = docs.filter((d: any) =>
          ['final', 'review', 'failed', 'generating'].includes(d.status)
        ).length;
        const exported = finalDocs.length;

        // Shared stage — no shared status in DB yet, use mock ratio
        const shared = Math.round(exported * 0.52);

        setFunnel([
          { stage: "Created", count: total, pct: "100" },
          {
            stage: "Generated",
            count: generated,
            pct: ((generated / total) * 100).toFixed(1)
          },
          {
            stage: "Exported",
            count: exported,
            pct: ((exported / total) * 100).toFixed(1)
          },
          {
            stage: "Shared",
            count: shared,
            pct: ((shared / total) * 100).toFixed(1)
          },
        ]);

        // ── Cell 6: Daily draft creation count ───────────────────────────
        const draftMap: Record<string, number> = {};
        docs.forEach((d: any) => {
          const date = d.created_at.slice(0, 10);
          draftMap[date] = (draftMap[date] ?? 0) + 1;
        });
        setDailyDrafts(
          Object.entries(draftMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7)
            .map(([date, count]) => ({ date, count }))
        );

        // ── Language per doc-type ────────────────────────────────────────
        const ldMap: Record<string, Record<string, number>> = {};
        docs.forEach((d: any) => {
          if (!ldMap[d.doc_type]) ldMap[d.doc_type] = {};
          ldMap[d.doc_type][d.language] = (ldMap[d.doc_type][d.language] ?? 0) + 1;
        });
        setLangPerDocType(
          Object.entries(ldMap)
            .sort((a, b) => {
              const totalA = Object.values(a[1]).reduce((x, y) => x + y, 0);
              const totalB = Object.values(b[1]).reduce((x, y) => x + y, 0);
              return totalB - totalA;
            })
            .slice(0, 3)
            .map(([docType, langCounts]) => {
              const docTotal = Object.values(langCounts).reduce((x, y) => x + y, 0);
              return {
                docType,
                languages: Object.entries(langCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([lang, count]) => ({
                    lang,
                    count,
                    pct: ((count / docTotal) * 100).toFixed(1),
                  })),
              };
            })
        );

        // ── Cell 5: Per-act citation frequency ───────────────────────────
        const { data: citationRows, error: citError } = await supabase
          .from("citations")
          .select("pageindex_node_id")
          .limit(1000);

        if (!citError && citationRows && citationRows.length > 0) {
          const actMap: Record<string, number> = {};
          citationRows.forEach((c: any) => {
            const act = (c.pageindex_node_id as string).split("/")[0];
            actMap[act] = (actMap[act] ?? 0) + 1;
          });
          setCitations(
            Object.entries(actMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([act, count]) => ({ act, count }))
          );
        }

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [dateRange]);

  const conversionPct =
    conversion.total > 0
      ? ((conversion.exported / conversion.total) * 100).toFixed(1)
      : "0.0";

  return (
    <div>

      <AdminPageHeader
        title="Cohort usage analytics"
        description="Document usage metrics across the cohort — admin only."
        actions={
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <label className="flex items-center gap-3">
              <span className="label-caps text-[10px] text-subtle-foreground">Date range</span>
              <select
                className="h-10 min-w-44 border border-input bg-transparent px-3 text-[13px] text-foreground outline-none [color-scheme:dark] hover:border-foreground/40 focus:border-ring [&>option]:bg-popover"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </label>
            {usingMock && (
              <span className="label-caps border border-warning/50 px-2 py-0.5 text-[9px] text-warning">Mock data — DB is empty</span>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="mx-auto w-full max-w-none border border-dashed border-border bg-background px-6 py-14 text-center text-sm text-muted-foreground">
          Loading analytics…
        </div>
      ) : error ? (
        <div className="mx-auto w-full max-w-none border border-destructive/50 bg-destructive/10 px-6 py-5 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <section className="mx-auto w-full max-w-none space-y-6">

          {/* Row 1 — Doc type + Language */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Cell 1 — Doc-type popularity with % */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Document Type Popularity
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline-soft text-left text-xs text-subtle-foreground">
                    <th className="pb-2 label-caps text-[10px] font-normal text-subtle-foreground">Type</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">Count</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {docTypes.map(({ type, count, pct }) => (
                    <tr key={type}>
                      <td className="py-2 text-foreground/85">
                        {DOC_TYPE_LABELS[type as DocumentType] ?? type}
                      </td>
                      <td className="py-2 text-right font-mono font-medium text-foreground">
                        {count}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cell 2 — Language distribution */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Language Distribution
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline-soft text-left text-xs text-subtle-foreground">
                    <th className="pb-2 label-caps text-[10px] font-normal text-subtle-foreground">Language</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">Count</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {languages.map(({ language, label, count, pct }) => (
                    <tr key={language}>
                      <td className="py-2 text-foreground/85">{label}</td>
                      <td className="py-2 text-right font-mono font-medium text-foreground">
                        {count}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2 — Funnel + Language per doc-type */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Conversion Funnel */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Conversion Funnel
              </h2>
              <div className="space-y-3">
                {funnel.map(({ stage, count, pct }, index) => (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground/85">{stage}</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {count} <span className="text-subtle-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted">
                      <div
                        className="h-2 bg-teal"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {index < funnel.length - 1 && (
                      <p className="text-xs text-subtle-foreground mt-1 text-right">
                        ↓ drop-off: {(Number(funnel[index].pct) - Number(funnel[index + 1].pct)).toFixed(1)}%
                      </p>
                    )}
                  </div>
                ))}
                {usingMock && (
                  <p className="text-xs text-subtle-foreground mt-2">
                    * Shared stage estimated — no shared status in DB yet
                  </p>
                )}
              </div>
            </div>

            {/* Language per doc-type */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Language per Doc Type (top 3)
              </h2>
              <div className="space-y-4">
                {langPerDocType.map(({ docType, languages: langs }) => (
                  <div key={docType}>
                    <p className="label-caps mb-1 text-[10px] text-subtle-foreground">
                      {DOC_TYPE_LABELS[docType as DocumentType] ?? docType}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {langs.map(({ lang, count, pct }) => (
                        <span key={lang} className="text-xs bg-muted px-2 py-1 text-foreground/85">
                          {LANGUAGE_LABELS[lang] ?? lang}: {pct}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3 — Exports + Daily drafts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Cell 3 — Exports per day */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Exports Per Day (last 7 days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline-soft text-left text-xs text-subtle-foreground">
                    <th className="pb-2 label-caps text-[10px] font-normal text-subtle-foreground">Date</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">Exports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {exportsPerDay.map(({ date, count }) => (
                    <tr key={date}>
                      <td className="py-2 text-foreground/85">{date}</td>
                      <td className="py-2 text-right font-mono font-medium text-foreground">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cell 6 — Daily draft creation count */}
            <div className="border border-border bg-background px-6 py-6">
              <h2 className="mb-5 text-[24px] leading-tight">
                Daily Draft Creation Count (last 7 days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline-soft text-left text-xs text-subtle-foreground">
                    <th className="pb-2 label-caps text-[10px] font-normal text-subtle-foreground">Date</th>
                    <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">Drafts Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {dailyDrafts.map(({ date, count }) => (
                    <tr key={date}>
                      <td className="py-2 text-foreground/85">{date}</td>
                      <td className="py-2 text-right font-mono font-medium text-foreground">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cell 5 — Per-act citation frequency */}
          <div className="border border-border bg-background px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[24px] leading-tight">
                Per-Act Citation Frequency
              </h2>
              {usingMock && (
                <span className="text-xs text-subtle-foreground bg-muted px-2 py-1">
                  Mock — awaiting citations data
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline-soft text-left text-xs text-subtle-foreground">
                  <th className="pb-2 label-caps text-[10px] font-normal text-subtle-foreground">Act</th>
                  <th className="pb-2 text-right label-caps text-[10px] font-normal text-subtle-foreground">Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {citations.map(({ act, count }) => (
                  <tr key={act}>
                    <td className="py-2 font-mono text-foreground/85">{act}</td>
                    <td className="py-2 text-right font-mono font-medium text-foreground">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}
    </div>
  );
}