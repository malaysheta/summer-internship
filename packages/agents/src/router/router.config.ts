/**
 * router.config.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Maps each agent step to its preferred LLM provider + model.
 * Change the values here to reroute any agent to a different model —
 * no code changes required in the agents themselves.
 */

export type ModelProvider = "claude" | "gemini" | "gpt" | "deepseek" | "bedrock";

export interface ModelConfig {
  /** Which provider to use. */
  provider: ModelProvider;
  /** Exact model string to pass to the provider SDK. */
  model: string;
  /** Max tokens for the completion. */
  maxTokens: number;
  /** Temperature (0 = deterministic, 1 = creative). Legal drafts want low temp. */
  temperature: number;
}

export interface StepRouteConfig {
  /** The primary model that should handle this step under normal circumstances. */
  preferred: ModelConfig;
  /** The backup model to call if the primary model fails. */
  fallback?: ModelConfig;
}

/**
 * Step-to-model routing table.
 * Key = agent step name (matches agent.ts export names).
 * Value = step route config for that step (preferred + fallback).
 */
/** Shared Claude fallback model string. */
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

/**
 * Every step runs on Claude via Amazon Bedrock (AWS_BEARER_TOKEN_BEDROCK +
 * BEDROCK_REGION + BEDROCK_MODEL_ID). "env" tells the Bedrock provider to use
 * BEDROCK_MODEL_ID, so swapping models is an env change, not a code change.
 * DeepSeek stays as the fallback.
 */
const BEDROCK_MODEL = "env";

export const ROUTER_CONFIG: Record<string, StepRouteConfig> = {
  classifier: {
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 512,
      temperature: 0.1,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 512,
      temperature: 0.1,
    },
  },
  planner: {
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 1024,
      temperature: 0.2,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 1024,
      temperature: 0.2,
    },
  },
  drafter: {
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 4096,
      temperature: 0.3,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
  citator: {
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 512,
      temperature: 0.0,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 512,
      temperature: 0.0,
    },
  },
  reviewer: {
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 1024,
      temperature: 0.2,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 1024,
      temperature: 0.2,
    },
  },
  translator: {
    // Legal Indic translation is precision-sensitive (#278): Claude (Bedrock).
    // 8K output: Indic scripts take 3-8x the English token count, per section.
    preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 8192,
      temperature: 0.1,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 8192,
      temperature: 0.1,
    },
  },
};

/** Default config used if a step is not found in ROUTER_CONFIG. */
export const DEFAULT_ROUTE_CONFIG: StepRouteConfig = {
  preferred: {
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 1024,
      temperature: 0.2,
    },
    fallback: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 1024,
      temperature: 0.2,
    },
};

