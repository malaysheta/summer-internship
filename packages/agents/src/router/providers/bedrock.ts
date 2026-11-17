/**
 * providers/bedrock.ts
 *
 * Amazon Bedrock provider (Claude on Bedrock) via the Converse API, authenticated
 * with a Bedrock API key (bearer token) — no AWS SDK or SigV4 needed.
 *
 * Env:
 *   AWS_BEARER_TOKEN_BEDROCK  Bedrock API key
 *   BEDROCK_REGION            e.g. ap-south-1
 *   BEDROCK_MODEL_ID          e.g. global.anthropic.claude-sonnet-4-5-20250929-v1:0
 *                             (used when the route config's model is "env")
 */
import type { LLMRequest, LLMResponse } from "../index.js";

// Claude Sonnet 4.5 on-demand list price (USD per 1K tokens).
const INPUT_COST_PER_1K = 0.003;
const OUTPUT_COST_PER_1K = 0.015;

export function bedrockModelId(model: string): string {
  return model === "env" || !model ? (process.env.BEDROCK_MODEL_ID ?? "") : model;
}

export async function callBedrock(req: LLMRequest): Promise<LLMResponse> {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION;
  const modelId = bedrockModelId(req.model);
  if (!token) throw new Error("[BedrockProvider] AWS_BEARER_TOKEN_BEDROCK is not set in environment.");
  if (!region) throw new Error("[BedrockProvider] BEDROCK_REGION is not set in environment.");
  if (!modelId) throw new Error("[BedrockProvider] BEDROCK_MODEL_ID is not set in environment.");

  const startMs = Date.now();
  const res = await fetch(
    `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        system: [{ text: req.systemPrompt }],
        messages: [{ role: "user", content: [{ text: req.userPrompt }] }],
        inferenceConfig: { maxTokens: req.maxTokens, temperature: req.temperature },
      }),
    },
  );

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    stopReason?: string;
    output?: { message?: { content?: Array<{ text?: string }> } };
    usage?: { inputTokens?: number; outputTokens?: number };
  };
  if (!res.ok) {
    throw new Error(`[BedrockProvider] ${res.status} ${body.message ?? res.statusText}`);
  }

  // A cut-off completion is a failure, not a result (it silently dropped the
  // tail of Indic translations, including citation placeholders).
  if (body.stopReason === "max_tokens") {
    throw new Error(`[BedrockProvider] output truncated at maxTokens=${req.maxTokens}`);
  }
  const text = (body.output?.message?.content ?? []).map((c) => c.text ?? "").join("");
  const tokens_in = body.usage?.inputTokens ?? 0;
  const tokens_out = body.usage?.outputTokens ?? 0;

  return {
    text,
    model: modelId,
    provider: "bedrock",
    tokens_in,
    tokens_out,
    cost_usd: (tokens_in / 1000) * INPUT_COST_PER_1K + (tokens_out / 1000) * OUTPUT_COST_PER_1K,
    latency_ms: Date.now() - startMs,
    fallback_used: false,
  };
}
