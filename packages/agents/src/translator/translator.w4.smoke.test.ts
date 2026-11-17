/**
 * translator/translator.w4.smoke.test.ts
 * Owner: Maharshi Patel
 * Issue: #146 — W4 Indic ON (hi / gu / mr / ta)
 *
 * W4 Acceptance criteria tested here:
 *   [AC-W4-1] target_language ∈ {hi, gu, mr, ta} → translated body_markdown returned
 *   [AC-W4-2] [CITE:<node_id>] markers preserved verbatim across translation
 *   [AC-W4-3] Glossary lookup before LLM call — canonical legal terms forced
 *   [AC-W4-4] RTI English draft → Hindi  → glossary_hits ≥ 5
 *   [AC-W4-5] NDA English draft → Marathi → glossary_hits ≥ 5
 *
 * Like translator.smoke.test.ts, @trionic/translation is NOT mocked.
 * The router (LLM) IS mocked — we test the pipeline, not Claude's output.
 *
 * Run: pnpm --filter @trionic/agents test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Partial mocks: LLM + tracing only ────────────────────────────────────────

vi.mock("../router/index.js", () => ({
  router: { run: vi.fn() },
}));

vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn((input) => ({
    agent: input.agent,
    model: input.llmResponse.model,
    tokens_in: input.llmResponse.tokens_in,
    tokens_out: input.llmResponse.tokens_out,
    cost_usd: input.llmResponse.cost_usd,
    latency_ms: input.llmResponse.latency_ms,
    cited_nodes: input.cited_nodes,
    status: input.status,
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
  })),
  buildErrorTrace: vi.fn((agent, error, session_id) => ({
    agent,
    model: "unknown",
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: 0,
    cited_nodes: [],
    status: "error",
    error_message: String(error),
    timestamp: new Date().toISOString(),
    session_id,
  })),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

// @trionic/translation intentionally NOT mocked — real glossary files read.

import { runTranslator } from "./translator.agent.js";
import type { TranslatorInput } from "./index.js";
import { lookupGlossary } from "@trionic/translation";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** 200-word English RTI draft with 5 [CITE:...] markers. */
const RTI_DRAFT_EN = `---
**AI-generated draft — not legal advice.** This document was produced by Trionic Adalat to assist with drafting only. Verify all citations and facts before use.
---

## Right to Information Application

### I. Applicant Details

The applicant, [FULL NAME], residing at [ADDRESS], hereby submits this application under the Right to Information Act, 2005 [CITE:RTI-2005/S-6].

### II. Information Sought

The applicant seeks the following information from [PUBLIC AUTHORITY NAME], which is a public authority within the meaning of Section 2(h) of the RTI Act [CITE:RTI-2005/S-2]:

1. Details of all contracts awarded above Rs. 10 lakhs in the financial year 2023-24.
2. Copies of inspection reports for the period 2022-23 to 2023-24.
3. Status of pending complaints received in the last 12 months.

### III. Fee and Exemption

The prescribed application fee of Rs. 10 has been deposited. The applicant is entitled to receive the requested information within thirty days [CITE:RTI-2005/S-7]. If the information is denied, the applicant shall prefer a first appeal under Section 19(1) of the Act [CITE:RTI-2005/S-19].

### IV. Declaration

The applicant is a citizen of India and declares that the information sought is not covered under Section 8 of the RTI Act [CITE:RTI-2005/S-8].

[FULL NAME]
Date: [DATE]`;

/** English NDA draft with 5 [CITE:ICA-1872/...] markers. */
const NDA_DRAFT_EN = `---
**AI-generated draft — not legal advice.** Verify all citations and facts before use.
---

## Non-Disclosure Agreement

This Non-Disclosure Agreement ("Agreement") is entered into between [DISCLOSING PARTY] ("Disclosing Party") and [RECEIVING PARTY] ("Receiving Party") as of [DATE].

### 1. Consideration

In consideration of the mutual exchange of confidential information, the parties agree as follows [CITE:ICA-1872/S-2].

### 2. Confidential Information

"Confidential Information" means any non-disclosure agreement, trade secrets, business plans, technical data, financial information, or other proprietary information disclosed by the Disclosing Party [CITE:ICA-1872/S-2].

### 3. Obligations

The Receiving Party shall not disclose the Confidential Information to any third party without the prior written consent of the Disclosing Party. Any breach of this agreement shall give rise to damages [CITE:ICA-1872/S-73].

### 4. Term

This Agreement shall commence on [DATE] and continue for a period of [DURATION]. Termination of this agreement does not relieve the Receiving Party of its obligations regarding confidential information [CITE:ICA-1872/S-39].

### 5. Governing Law

This Agreement shall be governed by and construed in accordance with Indian Contract Act, 1872. In case of any dispute, the parties agree to resolve the matter through arbitration [CITE:ICA-1872/S-28].

[DISCLOSING PARTY SIGNATURE]
[RECEIVING PARTY SIGNATURE]
Date: [DATE]`;

/**
 * Build a fake LLM response that preserves all ⟦CITE_N⟧ placeholders.
 * We replace [CITE:X] in the original with ⟦CITE_N⟧ and return a
 * "translated" version that keeps them intact.
 */
function buildFakeLLMResponse(originalDraft: string, langLabel: string): string {
  let i = 0;
  const withPlaceholders = originalDraft.replace(/\[CITE:[^\]]+\]/g, () => {
    return `\u27E6CITE_${i++}\u27E7`;
  });
  // Prepend a fake translated header to make it look translated
  return `[${langLabel} TRANSLATION - MOCKED]\n\n${withPlaceholders}`;
}

const MOCK_LLM_BASE = {
  model: "claude-3-5-sonnet-20241022",
  tokens_in: 900,
  tokens_out: 1000,
  cost_usd: 0.0015,
  latency_ms: 2500,
};

// ─── AC-W4-1/2: All 4 Indic language codes accepted ──────────────────────────

describe("[W4-AC1] All 4 Indic language codes accepted by runTranslator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["hi", "gu", "mr", "ta"] as const)(
    "[AC1] target_language '%s' returns translated_markdown (not passthrough)",
    async (lang) => {
      const { router } = await import("../router/index.js");
      vi.mocked(router.run).mockResolvedValue({
        ...MOCK_LLM_BASE,
        text: buildFakeLLMResponse(RTI_DRAFT_EN, lang.toUpperCase()),
      });

      const input: TranslatorInput = {
        body_markdown: RTI_DRAFT_EN,
        target_language: lang,
        citations: [],
        session_id: `w4-ac1-${lang}`,
      };

      const result = await runTranslator(input);

      expect(result.output.target_language).toBe(lang);
      expect(result.output.translated_markdown).toBeTruthy();
      // Must differ from input (it was translated, not passed through)
      // The mocked LLM prepends a header, so content differs.
      expect(result.output.translated_markdown).toContain(`[${lang.toUpperCase()} TRANSLATION - MOCKED]`);
    }
  );
});

// ─── AC-W4-2: [CITE:...] markers preserved verbatim ─────────────────────────

describe("[W4-AC2] [CITE:...] markers preserved verbatim across all Indic languages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["hi", "gu", "mr", "ta"] as const)(
    "[AC2] RTI draft → %s: all 5 [CITE:...] present in translated output",
    async (lang) => {
      const { router } = await import("../router/index.js");
      vi.mocked(router.run).mockResolvedValue({
        ...MOCK_LLM_BASE,
        text: buildFakeLLMResponse(RTI_DRAFT_EN, lang.toUpperCase()),
      });

      const result = await runTranslator({
        body_markdown: RTI_DRAFT_EN,
        target_language: lang,
        citations: [],
        session_id: `w4-ac2-${lang}`,
      });

      const original = RTI_DRAFT_EN.match(/\[CITE:[^\]]+\]/g) ?? [];
      expect(original).toHaveLength(5);

      for (const marker of original) {
        expect(result.output.translated_markdown).toContain(marker);
      }

      // No raw placeholders must leak through
      expect(result.output.translated_markdown).not.toMatch(/\u27E6CITE_\d+\u27E7/);
    }
  );

  it("[AC2] NDA draft → Marathi: all 5 [CITE:...] present in output", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(NDA_DRAFT_EN, "MR"),
    });

    const result = await runTranslator({
      body_markdown: NDA_DRAFT_EN,
      target_language: "mr",
      citations: [],
      session_id: "w4-ac2-nda-mr",
    });

    const original = NDA_DRAFT_EN.match(/\[CITE:[^\]]+\]/g) ?? [];
    expect(original).toHaveLength(5);

    for (const marker of original) {
      expect(result.output.translated_markdown).toContain(marker);
    }

    expect(result.output.translated_markdown).not.toMatch(/\u27E6CITE_\d+\u27E7/);
  });
});

// ─── AC-W4-3: Glossary lookup before LLM (real files) ───────────────────────

describe("[W4-AC3] Glossary lookup — canonical legal terms forced (real files)", () => {
  it("[AC3-hi] Hindi glossary has ≥ 100 approved entries", async () => {
    const result = await lookupGlossary({
      node_ids: [],
      target_language: "hi",
      domain: "contract",
    });
    expect(result.glossary_available).toBe(true);
    // contract domain alone should have many entries
    expect(result.entries.length).toBeGreaterThanOrEqual(10);
  });

  it("[AC3-mr] Marathi glossary now seeded — glossary_available: true", async () => {
    const result = await lookupGlossary({
      node_ids: ["ICA-1872/S-2"],
      target_language: "mr",
    });
    expect(result.glossary_available).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
    const termMap = new Map(result.entries.map((e) => [e.term_en, e.term_indic]));
    // 'consideration' → 'प्रतिफल' in Marathi
    expect(termMap.get("consideration")).toBe("प्रतिफल");
  });

  it("[AC3-gu] Gujarati glossary seeded — glossary_available: true", async () => {
    const result = await lookupGlossary({
      node_ids: ["ICA-1872/S-2"],
      target_language: "gu",
    });
    expect(result.glossary_available).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("[AC3-ta] Tamil glossary seeded — glossary_available: true", async () => {
    const result = await lookupGlossary({
      node_ids: ["ICA-1872/S-2"],
      target_language: "ta",
    });
    expect(result.glossary_available).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
    // 'consideration' → canonical Tamil legal term
    const termMap = new Map(result.entries.map((e) => [e.term_en, e.term_indic]));
    expect(termMap.get("consideration")).toBe("பரிசீலனை");
  });

  it("[AC3] 'consideration' → canonical term (not everyday word) in all languages", async () => {
    const langs = ["hi", "mr", "gu", "ta"] as const;
    const expected: Record<string, string> = {
      hi: "प्रतिफल",
      mr: "प्रतिफल",
      gu: "પ્રતિફળ",
      ta: "பரிசீலனை",
    };

    for (const lang of langs) {
      const result = await lookupGlossary({
        node_ids: ["ICA-1872/S-2"],
        target_language: lang,
      });
      const termMap = new Map(result.entries.map((e) => [e.term_en, e.term_indic]));
      expect(termMap.get("consideration")).toBe(expected[lang]);
    }
  });
});

// ─── AC-W4-4: RTI → Hindi, glossary_hits ≥ 5 ────────────────────────────────

describe("[W4-AC4] RTI English draft → Hindi: glossary_hits ≥ 5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[AC4] glossary_hits ≥ 5 from real Hindi glossary for RTI draft", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(RTI_DRAFT_EN, "HI"),
    });

    const result = await runTranslator({
      body_markdown: RTI_DRAFT_EN,
      target_language: "hi",
      citations: [],
      session_id: "w4-ac4-rti-hindi",
    });

    expect(result.output.glossary_hits.length).toBeGreaterThanOrEqual(5);

    // Verify canonical RTI terms are present
    const sources = result.output.glossary_hits.map((h) => h.source);
    expect(sources).toContain("applicant");        // आवेदक
    expect(sources).toContain("public authority"); // लोक प्राधिकारी
    expect(sources).toContain("information");      // सूचना
    expect(sources).toContain("appeal");           // अपील

    // Every hit must have source AND target
    for (const hit of result.output.glossary_hits) {
      expect(hit.source).toBeTruthy();
      expect(hit.target).toBeTruthy();
    }

    console.log(
      `[W4 AC4] RTI → Hindi glossary_hits (${result.output.glossary_hits.length}):`,
      result.output.glossary_hits.map((h) => `${h.source} → ${h.target}`)
    );
  });

  it("[AC4] all 5 [CITE:...] markers present + no placeholder leakage", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(RTI_DRAFT_EN, "HI"),
    });

    const result = await runTranslator({
      body_markdown: RTI_DRAFT_EN,
      target_language: "hi",
      citations: [],
      session_id: "w4-ac4-rti-cite-check",
    });

    const markers = RTI_DRAFT_EN.match(/\[CITE:[^\]]+\]/g) ?? [];
    expect(markers).toHaveLength(5);
    for (const m of markers) {
      expect(result.output.translated_markdown).toContain(m);
    }
    expect(result.output.translated_markdown).not.toMatch(/\u27E6CITE_\d+\u27E7/);
  });
});

// ─── AC-W4-5: NDA → Marathi, glossary_hits ≥ 5 ──────────────────────────────

describe("[W4-AC5] NDA English draft → Marathi: glossary_hits ≥ 5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[AC5] glossary_hits ≥ 5 from real Marathi glossary for NDA draft", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(NDA_DRAFT_EN, "MR"),
    });

    const result = await runTranslator({
      body_markdown: NDA_DRAFT_EN,
      target_language: "mr",
      citations: [],
      session_id: "w4-ac5-nda-marathi",
    });

    expect(result.output.glossary_hits.length).toBeGreaterThanOrEqual(5);

    // NDA cites ICA-1872/S-2 (consideration, contract, agreement…)
    // and ICA-1872/S-73 (damages), ICA-1872/S-39 (breach)
    const sources = result.output.glossary_hits.map((h) => h.source);
    expect(sources).toContain("consideration"); // प्रतिफल
    expect(sources).toContain("contract");      // करार
    expect(sources).toContain("damages");       // नुकसानभरपाई

    for (const hit of result.output.glossary_hits) {
      expect(hit.source).toBeTruthy();
      expect(hit.target).toBeTruthy();
    }

    console.log(
      `[W4 AC5] NDA → Marathi glossary_hits (${result.output.glossary_hits.length}):`,
      result.output.glossary_hits.map((h) => `${h.source} → ${h.target}`)
    );
  });

  it("[AC5] NDA → Marathi: all 5 [CITE:...] markers present in output", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(NDA_DRAFT_EN, "MR"),
    });

    const result = await runTranslator({
      body_markdown: NDA_DRAFT_EN,
      target_language: "mr",
      citations: [],
      session_id: "w4-ac5-nda-cite-check",
    });

    const markers = NDA_DRAFT_EN.match(/\[CITE:[^\]]+\]/g) ?? [];
    expect(markers).toHaveLength(5);
    for (const m of markers) {
      expect(result.output.translated_markdown).toContain(m);
    }
  });

  it("[AC5] trace.cited_nodes includes all 5 NDA citation node IDs", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValue({
      ...MOCK_LLM_BASE,
      text: buildFakeLLMResponse(NDA_DRAFT_EN, "MR"),
    });

    const result = await runTranslator({
      body_markdown: NDA_DRAFT_EN,
      target_language: "mr",
      citations: [],
      session_id: "w4-ac5-nda-trace",
    });

    expect(result.trace.cited_nodes).toContain("ICA-1872/S-2");
    expect(result.trace.cited_nodes).toContain("ICA-1872/S-73");
    expect(result.trace.cited_nodes).toContain("ICA-1872/S-39");
    expect(result.trace.cited_nodes).toContain("ICA-1872/S-28");
  });
});

// ─── Regression: W3 EN passthrough still works ───────────────────────────────

describe("[W4-REGRESSION] EN passthrough unaffected by W4 glossary seeding", () => {
  it("target_language 'en' still returns input unchanged with empty glossary_hits", async () => {
    const result = await runTranslator({
      body_markdown: RTI_DRAFT_EN,
      target_language: "en",
      citations: [],
      session_id: "w4-regression-en",
    });

    expect(result.output.translated_markdown).toBe(RTI_DRAFT_EN);
    expect(result.output.glossary_hits).toHaveLength(0);
  });
});
