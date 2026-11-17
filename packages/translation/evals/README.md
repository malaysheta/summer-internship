# Indic eval harness

Reference translation pairs + a scorer for the Translator agent's Indic output (#200).

```
evals/reference/<lang>.json   # { language, snapshot_id, pairs: [{ id, source_en, reference, glossary_terms }] }
src/evals/score.ts            # scorePair / summarize (compiled to dist/evals/score.js)
```

Run against the shipped references (smoke):

```bash
pnpm --filter @trionic/translation build
pnpm --filter @trionic/translation eval:indic ta
```

Run against real Translator output: write `{ "<pair id>": "<candidate text>" }` to a JSON
file and pass it as the second argument.

| Metric | Meaning |
|---|---|
| `cite_preserved` | every `[CITE:<node_id>]` from the English source is present verbatim |
| `glossary_hit_rate` | share of the pair's canonical terms (resolved via `glossary.<lang>.json`) found in the candidate |
| `char_f1` | character-bag F1 vs the reference; placeholder for chrF/BLEU |

Add a language: drop `evals/reference/<lang>.json` with ≥10 pairs and make sure
`data/glossary.<lang>.json` covers the `glossary_terms` you list.
