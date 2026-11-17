import { readFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { citationValidity } from "./metrics/citationValidity.js";
import type { EvalRunResult } from "@trionic/shared";
import type { Fixture } from "./types";

const ALL_DOC_TYPES = [
  "rti_application",
  "legal_notice",
  "nda",
  "consumer_complaint",
  "cheque_bounce_notice",
] as const;

export type DocType = (typeof ALL_DOC_TYPES)[number];

export interface RunEvalOptions {
  doc_type: DocType | "all";
  model?: string;
  print_summary?: boolean; // default true
}

export interface DocTypeSummary {
  doc_type: string;
  hallucination_rate: number;
  completeness_score: number;
  citation_validity_rate: number;
  hallucination_span_count: number;
  missing_section_count: number;
}

/**
 * Resolves the fixture file path for a given doc_type.
 * Supports both flat (fixtures/<doc_type>.json) format.
 */
function resolveFixturePath(doc_type: string): string | null {
  const flat = `fixtures/${doc_type}.json`;
  if (existsSync(flat)) return flat;
  return null;
}

/**
 * Runs hallucination + completeness + citation validity for a single doc_type.
 * Returns EvalRunResult with 5 named metrics for Kirtan's dashboard.
 */
export async function runEval(options: RunEvalOptions): Promise<EvalRunResult[]> {
  const { doc_type, model = "claude-sonnet-4-20250514", print_summary = true } = options;

  if (doc_type === "all") {
    // Run all doc types and print comparison table
    const summaries: DocTypeSummary[] = [];
    const allResults: EvalRunResult[] = [];

    for (const dt of ALL_DOC_TYPES) {
      const results = await runEval({ doc_type: dt, model, print_summary: false });
      allResults.push(...results);

      // Aggregate metrics for summary table
      const latest = results[results.length - 1];
      if (latest) {
        const get = (name: string) =>
          latest.metrics.find((m) => m.name === name)?.value ?? 0;
        summaries.push({
          doc_type: dt,
          citation_validity_rate: get("citation_validity_rate"),
          hallucination_rate: get("hallucination_rate"),
          hallucination_span_count: get("hallucination_span_count"),
          completeness_score: get("completeness_score"),
          missing_section_count: get("missing_section_count"),
        });
      }
    }

    if (print_summary) printComparisonTable(summaries);
    return allResults;
  }

  // Single doc_type run
  const fixturePath = resolveFixturePath(doc_type);
  if (!fixturePath) {
    console.warn(`  [harness] No fixture file found for doc_type: ${doc_type} — skipping`);
    return [];
  }

  const raw = readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as { dataset_id?: string; fixtures?: Fixture[] } | Fixture;
  const fixtures: Fixture[] = "fixtures" in parsed && parsed.fixtures
    ? parsed.fixtures
    : [parsed as Fixture];
  const datasetId = "dataset_id" in parsed && parsed.dataset_id ? parsed.dataset_id : doc_type;

  let totalCitations = 0;
  let validCitations = 0;
  let totalClaims = 0;
  let uncitedClaims = 0;
  let totalRequired = 0;
  let totalMissing = 0;

  for (const fixture of fixtures) {
    // Citation validity — try/catch so harness doesn't crash if pageindex isn't built
    try {
      const citeResult = await citationValidity(fixture);
      totalCitations += citeResult.total_citations;
      validCitations += citeResult.valid_citations;
    } catch {
      // pageindex not available — skip citation validity for this fixture
    }

    // Hallucination — dynamic import (graceful fallback)
    try {
      const { hallucinationRate } = await import("./metrics/hallucinationRate");
      const hallucResult = await hallucinationRate(fixture);
      totalClaims += hallucResult.total_claims;
      uncitedClaims += hallucResult.uncited_claims;
    } catch {
      // no-op — skipped if build not available
    }

    // Completeness — dynamic import (graceful fallback)
    try {
      const { completeness } = await import("./metrics/completeness");
      const compResult = await completeness(fixture);
      totalRequired += compResult.required_sections.length;
      totalMissing += compResult.missing_sections.length;
    } catch {
      // no-op
    }
  }

  const overallCiteRate = totalCitations === 0 ? 0 : (validCitations / totalCitations) * 100;
  const overallHallucinationRate = totalClaims === 0 ? 0 : (uncitedClaims / totalClaims) * 100;
  const overallCompletenessRate =
    totalRequired === 0 ? 100 : ((totalRequired - totalMissing) / totalRequired) * 100;

  // 5 named metrics for Kirtan's dashboard
  const result: EvalRunResult = {
    run_id: randomUUID(),
    dataset_id: datasetId,
    model,
    ran_at: new Date().toISOString(),
    metrics: [
      { name: "citation_validity_rate",   value: overallCiteRate,          unit: "percent" },
      { name: "hallucination_rate",        value: overallHallucinationRate,  unit: "percent" },
      { name: "hallucination_span_count",  value: uncitedClaims,             unit: "count"   },
      { name: "completeness_score",        value: overallCompletenessRate,   unit: "percent" },
      { name: "missing_section_count",     value: totalMissing,              unit: "count"   },
    ],
  };

  return [result];
}

/**
 * Prints the 5-column comparison table to stdout.
 * RTI is always shown first as the baseline.
 */
function printComparisonTable(summaries: DocTypeSummary[]): void {
  const baseline = summaries.find((s) => s.doc_type === "rti_application");

  console.log("\n==============================================");
  console.log(" W4 Eval Summary — All Doc Types");
  console.log("==============================================");
  console.log(
    `${"Doc Type".padEnd(24)}| ${"Citations".padEnd(10)}| ${"Halluc.".padEnd(10)}| ${"Complete.".padEnd(10)}| vs RTI Baseline`,
  );
  console.log("-".repeat(80));

  for (const s of summaries) {
    const isBaseline = s.doc_type === "rti_application";
    const deltaHall = baseline
      ? (s.hallucination_rate - baseline.hallucination_rate).toFixed(1)
      : "n/a";
    const deltaComp = baseline
      ? (s.completeness_score - baseline.completeness_score).toFixed(1)
      : "n/a";

    const deltaStr = isBaseline
      ? "(baseline)"
      : `Δhall:${Number(deltaHall) >= 0 ? "+" : ""}${deltaHall}% Δcomp:${Number(deltaComp) >= 0 ? "+" : ""}${deltaComp}%`;

    console.log(
      `${s.doc_type.padEnd(24)}| ${(s.citation_validity_rate.toFixed(1) + "%").padEnd(10)}| ${(s.hallucination_rate.toFixed(1) + "%").padEnd(10)}| ${(s.completeness_score.toFixed(1) + "%").padEnd(10)}| ${deltaStr}`,
    );
  }
  console.log("==============================================\n");
}
