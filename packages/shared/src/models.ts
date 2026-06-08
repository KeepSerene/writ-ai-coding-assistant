export interface ModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export type SupportedProvider = "google" | "groq";

interface SupportedChatModelDefinition {
  id: string;
  provider: SupportedProvider;
  pricing: ModelPricing;
  label: string;
}

export const SUPPORTED_CHAT_MODELS = [
  // Gemini models
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    provider: "google",
    label: "Gemini 2.5 Flash Lite",
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
  {
    id: "gemini-2.5-pro",
    provider: "google",
    label: "Gemini 2.5 Pro",
    pricing: {
      inputUsdPerMillionTokens: 1.25,
      outputUsdPerMillionTokens: 10,
    },
  },
  // Groq models
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    label: "Llama 3.1 8B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.05,
      outputUsdPerMillionTokens: 0.08,
    },
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    label: "Llama 3.3 70B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.59,
      outputUsdPerMillionTokens: 0.79,
    },
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    provider: "groq",
    label: "DeepSeek R1 Distill 70B (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 0.99,
    },
  },
  {
    id: "gemma2-9b-it",
    provider: "groq",
    label: "Gemma 2 9B IT (Groq)",
    pricing: {
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 0.2,
    },
  },
] as const satisfies readonly SupportedChatModelDefinition[];

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = SupportedChatModel["id"];

export const SUPPORTED_CHAT_MODEL_IDS = SUPPORTED_CHAT_MODELS.map(
  (m) => m.id,
) as [SupportedChatModelId, ...SupportedChatModelId[]];

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "gemini-2.5-flash";

export function findSupportedChatModel(modelId: string) {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
}
