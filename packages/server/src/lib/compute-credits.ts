import {
  findSupportedChatModel,
  SUPPORTED_CHAT_MODELS,
  type ModelPricing,
} from "@writ/shared";
import type { LanguageModelUsage } from "ai";

interface CalculateWritTokensParams {
  provider: string;
  model: string;
  usage?: LanguageModelUsage;
}

interface WritBillingMetrics {
  consumedTokens: number;
  estimatedUsdCost: number;
}

const TOKENS_PER_MILLION = 1_000_000;

/**
 * The Internal Economy Peg
 * We map $1.00 of underlying LLM API cost to 1,000,000 Writ Tokens.
 * This normalizes premium models (Mistral) and cheap models (Flash Lite)
 * into a single unified meter for Polar.sh.
 */
const USD_PER_WRIT_TOKEN = 0.000001;

function getModelPricing(provider: string, model: string): ModelPricing {
  const supportedChatModel = findSupportedChatModel(model);

  if (!supportedChatModel || supportedChatModel.provider !== provider) {
    if (!SUPPORTED_CHAT_MODELS.some((m) => m.provider === provider)) {
      throw new Error(`Unsupported billing provider: ${provider}`);
    }

    throw new Error(`Unsupported billing model: ${model}`);
  }

  return supportedChatModel.pricing;
}

function estimateCostInUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
) {
  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    TOKENS_PER_MILLION
  );
}

export function calculateWritConsumedTokens({
  provider,
  model,
  usage,
}: CalculateWritTokensParams): WritBillingMetrics {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  // Early exit if the stream aborted before generating tokens
  if (inputTokens === 0 && outputTokens === 0) {
    return { consumedTokens: 0, estimatedUsdCost: 0 };
  }

  const pricing = getModelPricing(provider, model);
  const estimatedUsdCost = estimateCostInUsd(
    inputTokens,
    outputTokens,
    pricing,
  );

  // Free models (like Cerebras/NIM) cost $0, thereby consuming 0 Writ Tokens
  if (estimatedUsdCost <= 0) {
    return { consumedTokens: 0, estimatedUsdCost: 0 };
  }

  // Convert API USD cost to Writ Tokens, ensuring a minimum charge of 1 token
  const consumedTokens = Math.max(
    1,
    Math.ceil(estimatedUsdCost / USD_PER_WRIT_TOKEN),
  );

  return { consumedTokens, estimatedUsdCost };
}
