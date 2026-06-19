import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from "@writ/shared";
import type { LanguageModel } from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import { mistral } from "@ai-sdk/mistral";
import { cerebras } from "@ai-sdk/cerebras";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type GoogleModelId = Extract<SupportedChatModel, { provider: "google" }>["id"];
type GroqModelId = Extract<SupportedChatModel, { provider: "groq" }>["id"];
type MistralModelId = Extract<
  SupportedChatModel,
  { provider: "mistral" }
>["id"];
type CerebrasModelId = Extract<
  SupportedChatModel,
  { provider: "cerebras" }
>["id"];
type NimModelId = Extract<SupportedChatModel, { provider: "nim" }>["id"];

export interface ResolvedModel {
  model: LanguageModel;
  modelId: SupportedChatModelId;
  provider: SupportedProvider;
  providerOptions?: ProviderOptions;
}

const GOOGLE_PROVIDER_OPTIONS: Partial<Record<GoogleModelId, ProviderOptions>> =
  {
    "gemini-3.5-flash": {
      google: {
        thinkingConfig: { thinkingLevel: "high", includeThoughts: true },
      },
    },
    "gemini-3.1-flash-lite": {
      google: {
        thinkingConfig: { thinkingLevel: "low", includeThoughts: true },
      },
    },
    "gemini-2.5-flash": {
      google: {
        thinkingConfig: { thinkingBudget: 8192, includeThoughts: true },
      },
    },
  };

const GROQ_PROVIDER_OPTIONS: Partial<Record<GroqModelId, ProviderOptions>> = {
  "openai/gpt-oss-120b": {
    groq: {
      reasoningFormat: "parsed",
      reasoningEffort: "high",
      parallelToolCalls: true,
    },
  },
  "openai/gpt-oss-20b": {
    groq: {
      reasoningFormat: "parsed",
      reasoningEffort: "high",
      parallelToolCalls: true,
    },
  },
  "qwen/qwen3-32b": {
    groq: {
      reasoningFormat: "parsed",
      reasoningEffort: "default",
      parallelToolCalls: true,
    },
  },
};

const MISTRAL_PROVIDER_OPTIONS: Partial<
  Record<MistralModelId, ProviderOptions>
> = {
  "devstral-latest": {
    mistral: { parallelToolCalls: false },
  },
  "mistral-small-latest": {
    mistral: { parallelToolCalls: false, reasoningEffort: "high" },
  },
};

const CEREBRAS_PROVIDER_OPTIONS: Partial<
  Record<CerebrasModelId, ProviderOptions>
> = {
  "gpt-oss-120b": {
    cerebras: { reasoningEffort: "medium" },
  },
};

function assertUnsupportedProvider(provider: never): never {
  throw new Error(`Unsupported provider: ${provider}`);
}

function resolveGoogleModel(modelId: GoogleModelId): ResolvedModel {
  return {
    model: google(modelId),
    modelId,
    provider: "google",
    providerOptions: GOOGLE_PROVIDER_OPTIONS[modelId],
  };
}

function resolveGroqModel(modelId: GroqModelId): ResolvedModel {
  return {
    model: groq(modelId),
    modelId,
    provider: "groq",
    providerOptions: GROQ_PROVIDER_OPTIONS[modelId],
  };
}

function resolveMistralModel(modelId: MistralModelId): ResolvedModel {
  return {
    model: mistral(modelId),
    modelId,
    provider: "mistral",
    providerOptions: MISTRAL_PROVIDER_OPTIONS[modelId],
  };
}

function resolveCerebrasModel(modelId: CerebrasModelId): ResolvedModel {
  return {
    model: cerebras(modelId),
    modelId,
    provider: "cerebras",
    providerOptions: CEREBRAS_PROVIDER_OPTIONS[modelId],
  };
}

function resolveNimModel(modelId: NimModelId): ResolvedModel {
  const nimApiKey = process.env["NIM_API_KEY"];

  if (!nimApiKey) throw new Error("NIM_API_KEY is missing in the environment");

  const nim = createOpenAICompatible({
    name: "nim",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: { Authorization: `Bearer ${nimApiKey}` },
  });

  return { model: nim(modelId), modelId, provider: "nim" };
}

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;

  switch (provider) {
    case "google":
      return resolveGoogleModel(model.id);
    case "groq":
      return resolveGroqModel(model.id);
    case "mistral":
      return resolveMistralModel(model.id);
    case "cerebras":
      return resolveCerebrasModel(model.id);
    case "nim":
      return resolveNimModel(model.id);
    default:
      return assertUnsupportedProvider(provider);
  }
}

export function isChatModelSupported(
  modelId: string,
): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) !== undefined;
}

export function resolveModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);

  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
}
