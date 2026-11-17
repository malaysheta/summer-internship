/**
 * router/router.test.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Tests for the LLM Router — resolve() and run() with resilient fallbacks.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { LLMRouter } from "./index.js";
import { ROUTER_CONFIG } from "./router.config.js";
import { callClaude } from "./providers/claude.js";
import { callDeepSeek } from "./providers/deepseek.js";
import { callBedrock } from "./providers/bedrock.js";
import { CostCapTracker } from "./costCapTracker.js";

vi.mock("./providers/claude.js", () => ({ callClaude: vi.fn() }));
vi.mock("./providers/gemini.js", () => ({ callGemini: vi.fn() }));
vi.mock("./providers/gpt.js", () => ({ callGPT: vi.fn() }));
vi.mock("./providers/deepseek.js", () => ({ callDeepSeek: vi.fn() }));
vi.mock("./providers/bedrock.js", () => ({ callBedrock: vi.fn() }));

describe("LLMRouter.resolve()", () => {
  const router = new LLMRouter();

  it("resolves planner to bedrock provider preferred", () => {
    const config = router.resolve("planner");
    expect(config.preferred.provider).toBe("bedrock");
  });

  it("resolves reviewer to bedrock provider preferred", () => {
    const config = router.resolve("reviewer");
    expect(config.preferred.provider).toBe("bedrock");
  });

  it("falls back to default config for unknown steps", () => {
    const config = router.resolve("unknown_step_xyz");
    expect(config.preferred.provider).toBe("bedrock");
  });

  it("all configured steps have a valid provider", () => {
    const validProviders = ["claude", "gemini", "gpt", "deepseek", "bedrock"];
    for (const [_, cfg] of Object.entries(ROUTER_CONFIG)) {
      expect(validProviders).toContain(cfg.preferred.provider);
      if (cfg.fallback) {
        expect(validProviders).toContain(cfg.fallback.provider);
      }
    }
  });
});

describe("LLMRouter.run() with mock providers", () => {
  const router = new LLMRouter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes the preferred model successfully", async () => {
    vi.mocked(callBedrock).mockResolvedValueOnce({
      text: "bedrock success",
      model: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
      provider: "bedrock",
      tokens_in: 10,
      tokens_out: 20,
      cost_usd: 0.0001,
      latency_ms: 100,
      fallback_used: false,
    });

    const res = await router.run("reviewer", "You are reviewer", "Review draft");
    expect(res.text).toBe("bedrock success");
    expect(res.provider).toBe("bedrock");
    expect(res.fallback_used).toBe(false);
    expect(callBedrock).toHaveBeenCalledTimes(1);
    expect(callDeepSeek).not.toHaveBeenCalled();
  });

  it("fails over to the fallback model if preferred fails", async () => {
    // Preferred (bedrock) fails
    vi.mocked(callBedrock).mockRejectedValueOnce(new Error("DeepSeek quota exceeded"));
    // Fallback (deepseek) succeeds
    vi.mocked(callDeepSeek).mockResolvedValueOnce({
      text: "deepseek success",
      model: "deepseek-chat",
      provider: "deepseek",
      tokens_in: 15,
      tokens_out: 25,
      cost_usd: 0.0002,
      latency_ms: 150,
      fallback_used: false,
    });

    const res = await router.run("reviewer", "You are reviewer", "Review draft");
    expect(res.text).toBe("deepseek success");
    expect(res.provider).toBe("deepseek");
    expect(res.fallback_used).toBe(true);
    expect(callBedrock).toHaveBeenCalledTimes(1);
    expect(callDeepSeek).toHaveBeenCalledTimes(1);
  });

  it("throws a cumulative error if both preferred and fallback fail", async () => {
    vi.mocked(callBedrock).mockRejectedValueOnce(new Error("DeepSeek quota exceeded"));
    vi.mocked(callDeepSeek).mockRejectedValueOnce(new Error("Claude rate limit"));

    await expect(
      router.run("reviewer", "You are reviewer", "Review draft")
    ).rejects.toThrow("Both preferred and fallback models failed for step \"reviewer\"");
  });
});

describe("LLMRouter.run() with DeepSeek & Cost Cap", () => {
  const router = new LLMRouter();

  const savedDrafter = ROUTER_CONFIG.drafter;
  afterAll(() => {
    ROUTER_CONFIG.drafter = savedDrafter;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // DeepSeek is now the fallback; pin a deepseek→claude route so these tests
    // keep exercising the cost cap on the preferred path.
    ROUTER_CONFIG.drafter = {
      preferred: { provider: "deepseek", model: "deepseek-chat", maxTokens: 4096, temperature: 0.3 },
      fallback: { provider: "claude", model: "claude-3-5-sonnet-20241022", maxTokens: 4096, temperature: 0.3 },
    };
    CostCapTracker.setLimit(5.0);
    (CostCapTracker as any).memoryCost = 0;

    try {
      const fs = require("fs");
      const path = require("path");
      const file = path.join(process.cwd(), ".deepseek-cost.json");
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (_) {}
  });

  it("pinned drafter route prefers deepseek", () => {
    const config = router.resolve("drafter");
    expect(config.preferred.provider).toBe("deepseek");
    expect(config.preferred.model).toBe("deepseek-chat");
  });

  it("executes DeepSeek successfully and updates cumulative cost", async () => {
    vi.mocked(callDeepSeek).mockResolvedValueOnce({
      text: "deepseek drafted notice successfully",
      model: "deepseek-chat",
      provider: "deepseek",
      tokens_in: 100,
      tokens_out: 200,
      cost_usd: 0.00007,
      latency_ms: 150,
      fallback_used: false,
    });

    const startCost = CostCapTracker.getDailyCost();
    const res = await router.run("drafter", "System prompt", "User prompt");

    expect(res.text).toBe("deepseek drafted notice successfully");
    expect(res.provider).toBe("deepseek");
    expect(res.fallback_used).toBe(false);
    expect(callDeepSeek).toHaveBeenCalledTimes(1);
    expect(CostCapTracker.getDailyCost()).toBe(startCost + 0.00007);
  });

  it("transparently retries with fallback (Claude) if DeepSeek fails", async () => {
    vi.mocked(callDeepSeek).mockRejectedValueOnce(new Error("DeepSeek 503 Service Unavailable"));
    vi.mocked(callClaude).mockResolvedValueOnce({
      text: "claude fallback draft successfully",
      model: "claude-3-5-sonnet-20241022",
      provider: "claude",
      tokens_in: 100,
      tokens_out: 200,
      cost_usd: 0.003,
      latency_ms: 300,
      fallback_used: false,
    });

    const res = await router.run("drafter", "System prompt", "User prompt");

    expect(res.text).toBe("claude fallback draft successfully");
    expect(res.provider).toBe("claude");
    expect(res.fallback_used).toBe(true);
    expect(callDeepSeek).toHaveBeenCalledTimes(1);
    expect(callClaude).toHaveBeenCalledTimes(1);
  });

  it("transparently retries with fallback if DeepSeek cost cap is exceeded", async () => {
    CostCapTracker.setLimit(0.00001);
    CostCapTracker.addCost(0.00005);

    vi.mocked(callClaude).mockResolvedValueOnce({
      text: "claude fallback draft successfully due to cost cap",
      model: "claude-3-5-sonnet-20241022",
      provider: "claude",
      tokens_in: 100,
      tokens_out: 200,
      cost_usd: 0.003,
      latency_ms: 200,
      fallback_used: false,
    });

    const res = await router.run("drafter", "System prompt", "User prompt");

    expect(res.text).toBe("claude fallback draft successfully due to cost cap");
    expect(res.provider).toBe("claude");
    expect(res.fallback_used).toBe(true);
    expect(callDeepSeek).not.toHaveBeenCalled();
    expect(callClaude).toHaveBeenCalledTimes(1);
  });
});

describe("Bedrock routing (all steps)", () => {
  it("every step prefers Bedrock with DeepSeek fallback", () => {
    for (const [step, cfg] of Object.entries(ROUTER_CONFIG)) {
      if (step === "drafter") continue; // mutated by the cost-cap block above
      expect(cfg.preferred.provider, step).toBe("bedrock");
      expect(cfg.fallback?.provider, step).toBe("deepseek");
    }
  });
});
