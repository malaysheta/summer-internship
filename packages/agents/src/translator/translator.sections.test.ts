import { describe, it, expect, vi } from "vitest";

vi.mock("../router/index.js", () => ({ router: { run: vi.fn() } }));
vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn(() => ({})),
  buildErrorTrace: vi.fn(() => ({})),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

import { router } from "../router/index.js";
import { runTranslator, splitForTranslation } from "./translator.agent.js";

/** Pull the text the agent asked us to translate out of its user prompt. */
const docOf = (user: string) => user.split("<document>\n")[1].split("\n</document>")[0];

const section = (n: number) =>
  `## Section ${n}\n\n${"Formal legal text. ".repeat(40)}It relies on the Act [CITE:NI-1881/S-${130 + n}].`;
const LONG_DRAFT = `# NOTICE\n\n${[1, 2, 3, 4, 5, 6].map(section).join("\n\n")}`;

describe("section-wise translation (long Indic drafts)", () => {
  it("splits long drafts at headings and keeps short drafts whole", () => {
    expect(splitForTranslation("short text")).toEqual(["short text"]);
    const pieces = splitForTranslation(LONG_DRAFT.replace(/\[CITE:[^\]]+\]/g, "⟦CITE_0⟧"));
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((p) => p.length <= 2200)).toBe(true);
  });

  it("translates each section separately and keeps every citation", async () => {
    // Fake LLM: "translate" by echoing the piece it was given (placeholders intact).
    vi.mocked(router.run).mockImplementation(async (_step, _sys, user) => ({
      text: docOf(user),
      model: "m", provider: "bedrock", tokens_in: 1, tokens_out: 1, cost_usd: 0, latency_ms: 1, fallback_used: false,
    }) as any);
    const r = await runTranslator({ body_markdown: LONG_DRAFT, target_language: "gu" });
    expect(vi.mocked(router.run).mock.calls.length).toBeGreaterThan(1);
    for (let n = 1; n <= 6; n++) expect(r.output.translated_markdown).toContain(`[CITE:NI-1881/S-${130 + n}]`);
  });

  it("retries a section once when the model drops its citation", async () => {
    let calls = 0;
    vi.mocked(router.run).mockReset().mockImplementation(async (_s, _sys, user) => {
      calls++;
      const body = docOf(user);
      return { text: calls === 1 ? body.replace(/⟦CITE_\d+⟧/g, "") : body, model: "m", provider: "bedrock",
        tokens_in: 1, tokens_out: 1, cost_usd: 0, latency_ms: 1, fallback_used: false } as any;
    });
    const r = await runTranslator({ body_markdown: "Short notice [CITE:NI-1881/S-138].", target_language: "ta" });
    expect(calls).toBe(2);
    expect(r.output.translated_markdown).toContain("[CITE:NI-1881/S-138]");
  });
});

describe("stripPromptEcho", () => {
  it("removes echoed wrapper tags and legacy markers but keeps content", async () => {
    const { stripPromptEcho } = await import("./translator.agent.js");
    expect(stripPromptEcho("<document>\n## શીર્ષક\ntext ⟦CITE_0⟧\n</document>")).toBe("## શીર્ષક\ntext ⟦CITE_0⟧");
    expect(stripPromptEcho("text\n\n### End of Document")).toBe("text");
  });
});
