export interface ModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export type SupportedProvider =
  | "google"
  | "groq"
  | "mistral"
  | "cerebras"
  | "nim";

interface SupportedChatModelDefinition {
  id: string;
  provider: SupportedProvider;
  label: string;
  pricing: ModelPricing;
}

export const SUPPORTED_CHAT_MODELS = [
  // Gemini models
  {
    id: "gemini-3.5-flash",
    provider: "google",
    label: "Gemini 3.5 Flash",
    pricing: {
      inputUsdPerMillionTokens: 0.075,
      outputUsdPerMillionTokens: 0.3,
    },
  },
  {
    id: "gemini-3.1-flash-lite",
    provider: "google",
    label: "Gemini 3.1 Flash Lite",
    pricing: {
      inputUsdPerMillionTokens: 0.018,
      outputUsdPerMillionTokens: 0.072,
    },
  },
  {
    id: "gemini-2.5-flash",
    provider: "google",
    label: "Gemini 2.5 Flash",
    pricing: {
      inputUsdPerMillionTokens: 0.075,
      outputUsdPerMillionTokens: 0.3,
    },
  },
  // Groq models
  {
    id: "openai/gpt-oss-120b",
    provider: "groq",
    label: "GPT OSS 120B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.15,
      outputUsdPerMillionTokens: 0.6,
    },
  },
  {
    id: "openai/gpt-oss-20b",
    provider: "groq",
    label: "GPT OSS 20B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.075,
      outputUsdPerMillionTokens: 0.3,
    },
  },
  {
    id: "qwen/qwen3-32b",
    provider: "groq",
    label: "Qwen3 32B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.29,
      outputUsdPerMillionTokens: 0.59,
    },
  },
  // Mistral models
  {
    id: "devstral-latest",
    provider: "mistral",
    label: "Devstral (Mistral)",
    pricing: { inputUsdPerMillionTokens: 0.4, outputUsdPerMillionTokens: 2.0 },
  },
  {
    id: "mistral-small-latest",
    provider: "mistral",
    label: "Mistral Small (Mistral)",
    pricing: { inputUsdPerMillionTokens: 0.1, outputUsdPerMillionTokens: 0.3 },
  },
  // Cerebras models
  {
    id: "gpt-oss-120b",
    provider: "cerebras",
    label: "GPT OSS 120B (Cerebras)",
    pricing: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
  },
  {
    id: "zai-glm-4.7",
    provider: "cerebras",
    label: "GLM 4.7 (Cerebras)",
    pricing: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
  },

  // NVIDIA NIM models
  {
    id: "moonshotai/kimi-k2.6",
    provider: "nim",
    label: "Kimi K2.6 (NVIDIA NIM)",
    pricing: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
  },
] as const satisfies readonly SupportedChatModelDefinition[];

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = SupportedChatModel["id"];

export const SUPPORTED_CHAT_MODEL_IDS = SUPPORTED_CHAT_MODELS.map(
  (m) => m.id,
) as [SupportedChatModelId, ...SupportedChatModelId[]];

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId =
  "openai/gpt-oss-120b";

export function findSupportedChatModel(modelId: string) {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
}
