import { describe, it, expect } from "vitest";
import { scorePair, charF1, loadReference, summarize } from "./score.js";

describe("indic eval skeleton (#200)", () => {
  const pairs = loadReference("ta");

  it("ships at least 10 Tamil reference pairs", () => {
    expect(pairs.length).toBeGreaterThanOrEqual(10);
  });

  it("reference scored against itself is perfect", () => {
    const s = summarize(pairs.map((p) => scorePair(p, p.reference, "ta")));
    expect(s.cite_preserved_rate).toBe(1);
    expect(s.char_f1).toBe(1);
    expect(s.glossary_hit_rate).toBeGreaterThan(0.5);
  });

  it("flags a dropped citation and a missing glossary term", () => {
    const p = pairs.find((x) => x.id === "ta-003")!;
    const s = scorePair(p, "இந்த ஒப்பந்தம் செல்லுபடியாகும் விலையால் ஆதரிக்கப்படுகிறது.", "ta");
    expect(s.cite_preserved).toBe(false);
    expect(s.glossary_hit_rate).toBeLessThan(1);
  });

  it("charF1 is 0 for disjoint strings and symmetric", () => {
    expect(charF1("abc", "xyz")).toBe(0);
    expect(charF1("abcd", "abce")).toBeCloseTo(charF1("abce", "abcd"));
  });
});
