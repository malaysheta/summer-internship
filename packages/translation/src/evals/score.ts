/**
 * Indic eval harness skeleton (#200, Anshul Jangid).
 *
 * Scores a candidate translation against a reference pair on three axes that
 * matter for legal drafts, cheapest first:
 *   1. cite_preserved   — every [CITE:<node_id>] in the source survives verbatim
 *   2. glossary_hit_rate — share of the pair's canonical terms (looked up in
 *                          glossary.<lang>.json) that appear in the candidate
 *   3. char_f1          — character-level F1 vs the reference (script-agnostic
 *                          stand-in for chrF until a real BLEU/chrF dep is justified)
 *
 * Usage (after `pnpm --filter @trionic/translation build`):
 *   node dist/evals/score.js ta                 # scores reference vs itself (smoke)
 *   node dist/evals/score.js ta candidates.json # { "<pair id>": "<candidate text>" }
 */
import { readFileSync } from "fs";
import { join } from "path";
import { glossary } from "../glossary.js";
import type { IndicLanguage } from "../glossary.js";

export interface ReferencePair {
  id: string;
  source_en: string;
  reference: string;
  glossary_terms: string[];
}

export interface PairScore {
  id: string;
  cite_preserved: boolean;
  glossary_hit_rate: number; // 0..1, NaN-free (1 when the pair lists no terms)
  char_f1: number;           // 0..1
}

const CITE = /\[CITE:[^\]]+\]/g;

export function scorePair(pair: ReferencePair, candidate: string, lang: IndicLanguage): PairScore {
  const sourceCites = pair.source_en.match(CITE) ?? [];
  const cite_preserved = sourceCites.every((c) => candidate.includes(c));

  const expected = pair.glossary_terms
    .map((t) => glossary.lookup(t, lang)?.translation)
    .filter((t): t is string => Boolean(t));
  const hits = expected.filter((t) => candidate.includes(t)).length;
  const glossary_hit_rate = expected.length === 0 ? 1 : hits / expected.length;

  return { id: pair.id, cite_preserved, glossary_hit_rate, char_f1: charF1(candidate, pair.reference) };
}

/** Character bag F1 (whitespace ignored). Good enough to rank candidates; swap for chrF later. */
export function charF1(candidate: string, reference: string): number {
  const bag = (s: string) => {
    const m = new Map<string, number>();
    for (const ch of s.replace(/\s+/g, "")) m.set(ch, (m.get(ch) ?? 0) + 1);
    return m;
  };
  const c = bag(candidate);
  const r = bag(reference);
  let overlap = 0;
  for (const [ch, n] of c) overlap += Math.min(n, r.get(ch) ?? 0);
  const cLen = [...c.values()].reduce((a, b) => a + b, 0);
  const rLen = [...r.values()].reduce((a, b) => a + b, 0);
  if (cLen === 0 || rLen === 0) return 0;
  const p = overlap / cLen;
  const rc = overlap / rLen;
  return p + rc === 0 ? 0 : (2 * p * rc) / (p + rc);
}

export function loadReference(lang: IndicLanguage): ReferencePair[] {
  const file = join(__dirname, "..", "..", "evals", "reference", `${lang}.json`);
  return (JSON.parse(readFileSync(file, "utf-8")) as { pairs: ReferencePair[] }).pairs;
}

export function summarize(scores: PairScore[]) {
  const n = scores.length || 1;
  return {
    pairs: scores.length,
    cite_preserved_rate: scores.filter((s) => s.cite_preserved).length / n,
    glossary_hit_rate: scores.reduce((a, s) => a + s.glossary_hit_rate, 0) / n,
    char_f1: scores.reduce((a, s) => a + s.char_f1, 0) / n,
  };
}

if (require.main === module) {
  const lang = (process.argv[2] ?? "ta") as IndicLanguage;
  const candidates: Record<string, string> = process.argv[3]
    ? JSON.parse(readFileSync(process.argv[3], "utf-8"))
    : {};
  const pairs = loadReference(lang);
  const scores = pairs.map((p) => scorePair(p, candidates[p.id] ?? p.reference, lang));
  console.table(scores);
  console.log(summarize(scores));
}
