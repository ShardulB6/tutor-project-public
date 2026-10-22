import type { OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { createOpenRouter, type OpenRouterProviderOptions } from "@openrouter/ai-sdk-provider";
import { createGateway, type generateText } from "ai";
import type { AiProvider } from "./ai-provider";
import {
  getOpenRouterModelId,
  supportsTutorReasoning,
  supportsTutorReasoningSummary,
  type TutorModelId,
  type TutorReasoningLevel,
} from "./models";

type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;

export function createAiModel(provider: AiProvider, apiKey: string, modelId: string) {
  return provider === "openrouter"
    ? createOpenRouter({ apiKey, compatibility: "strict" }).chat(getOpenRouterModelId(modelId))
    : createGateway({ apiKey })(modelId);
}

export function getReasoningSettings(
  provider: AiProvider,
  modelId: TutorModelId,
  reasoningLevel: TutorReasoningLevel,
): { sendReasoning: boolean; providerOptions: ProviderOptions } | null {
  if (!supportsTutorReasoning(modelId)) {
    return null;
  }

  if (provider === "openrouter") {
    const openrouterOptions = {
      reasoning: { effort: reasoningLevel },
    } satisfies OpenRouterProviderOptions;
    return { sendReasoning: true, providerOptions: { openrouter: openrouterOptions } };
  }

  if (modelId.startsWith("anthropic/")) {
    return {
      sendReasoning: true,
      providerOptions: {
        anthropic: {
          thinking: { type: "adaptive", display: "summarized" },
          effort: reasoningLevel,
        },
      },
    };
  }

  if (modelId.startsWith("google/")) {
    return {
      sendReasoning: true,
      providerOptions: {
        google: {
          // Gemini 3 models only accept low or high thinking levels.
          thinkingConfig: {
            thinkingLevel: reasoningLevel === "low" ? "low" : "high",
            includeThoughts: true,
          },
        },
      },
    };
  }

  const supportsReasoningSummary = supportsTutorReasoningSummary(modelId);
  const openaiOptions = {
    reasoningEffort: reasoningLevel,
    ...(supportsReasoningSummary ? { reasoningSummary: "detailed" } : {}),
  } satisfies OpenAILanguageModelResponsesOptions;
  return { sendReasoning: supportsReasoningSummary, providerOptions: { openai: openaiOptions } };
}
