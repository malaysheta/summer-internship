# Evals Harness — Integration Guide

Owner: Kirtan Patel (@KirtanPatel18) · Team F — Evals & Telemetry  
For: @Ayush5112006 (issue #289), @parth-thakkar304 (issue #290)

---

## How to run the harness

From inside `packages/evals`:

```bash
pnpm exec tsx src/run.ts --dataset rti-week3 --models claude-sonnet-4-20250514
```

Multiple models:

```bash
pnpm exec tsx src/run.ts --dataset rti-week3 --models claude-sonnet-4-20250514,gpt-4o,deepseek-chat
```

`--dataset` maps to `fixtures/<dataset_id>.json`. Default is `rti-week3`.

---

## What the harness produces

One `EvalRunResult` per model per run (shape from `@trionic/shared`):

```json
{
  "run_id": "uuid",
  "dataset_id": "rti-week3",
  "model": "claude-sonnet-4-20250514",
  "ran_at": "2026-06-10T05:49:00.643Z",
  "metrics": [
    {
      "name": "citation_validity_rate",
      "value": 84.61538461538461,
      "unit": "percent"
    }
  ]
}
```

---

## Where data lands

Results are written to the `eval_runs` table in Supabase via POST `/api/admin/evals/run`.

**Note:** CLI runs skip the write gracefully if admin auth is not present — expected behavior, not a bug. Real writes happen from the deployed Vercel environment only.

---

## For @Ayush5112006 — Model A/B comparison cell (#289)

Read from `eval_runs` table and filter by:

- `eval_type = "per_llm_dashboard"` — multi-model runs
- `config.dataset_id` — which fixture set was used

Each row has `results.citation_validity_rate` per model. One row per model per run. Use this to build the model A/B comparison cell in your dashboard.

Comparison dashboard is also live at `/admin/evals/comparison` — built by Kirtan, you can reference the page structure.

---

## For @parth-thakkar304 — Per-act citation frequency (#290)

The harness tracks which `node_id`s are cited and which are invalid per run. This data lives in `eval_runs.results.invalid_citations` array. Per-act citation frequency can be derived from valid citations across all runs.

---

## Current metrics available

| Metric                   | Source                | Status        |
| ------------------------ | --------------------- | ------------- |
| `citation_validity_rate` | `citationValidity.ts` | Live          |
| `hallucination_rate`     | Kaushal PR #231       | Pending merge |
| `completeness`           | Kaushal PR #231       | Pending merge |
| `cost_per_run`           | YugUmrania traces     | Pending       |
| `p95_latency`            | YugUmrania traces     | Pending       |

---

## Key files

| File                                             | Purpose                                     |
| ------------------------------------------------ | ------------------------------------------- |
| `packages/evals/src/run.ts`                      | Harness entry point, CLI args               |
| `packages/evals/src/metrics/citationValidity.ts` | Citation validity metric                    |
| `packages/evals/fixtures/rti-week3.json`         | 10 real RTI fixtures                        |
| `packages/shared/src/types.ts`                   | EvalRunResult, EvalMetric — source of truth |
| `apps/web/app/admin/evals/comparison/page.tsx`   | Multi-model comparison dashboard            |
