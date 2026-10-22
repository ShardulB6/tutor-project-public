export type TutorModelCapability = "vision" | "pdf" | "reasoning";

export type TutorModel = {
  id: string;
  provider: string;
  name: string;
  openRouter?: boolean;
  openRouterId?: string;
  capabilities: readonly TutorModelCapability[];
};

export const CHAT_TITLE_MODEL = "openai/gpt-5-nano" as const;
export const STUDIO_GENERATION_MODEL: TutorModelId = "openai/gpt-4o-mini";

export const TUTOR_MODELS = [
  {
    id: "openai/gpt-4o-mini",
    provider: "Open AI",
    name: "GPT-4o mini",
    capabilities: ["vision", "pdf"],
    openRouter: true,
  },
  {
    id: "openai/o1",
    provider: "Open AI",
    name: "o1",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "openai/gpt-4.1-mini",
    provider: "Open AI",
    name: "GPT-4.1 mini",
    capabilities: ["vision", "pdf"],
    openRouter: true,
  },
  {
    id: "openai/o3",
    provider: "Open AI",
    name: "o3",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "openai/gpt-5.4",
    provider: "Open AI",
    name: "GPT-5.4",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "openai/gpt-5.6-sol",
    provider: "Open AI",
    name: "GPT-5.6 Sol",
    capabilities: ["vision", "pdf", "reasoning"],
  },
  {
    id: "openai/gpt-5.6-luna",
    provider: "Open AI",
    name: "GPT-5.6 Luna",
    capabilities: ["vision", "pdf", "reasoning"],
  },
  {
    id: "openai/gpt-5.6-terra",
    provider: "Open AI",
    name: "GPT-5.6 Terra",
    capabilities: ["vision", "pdf", "reasoning"],
  },
  {
    id: "anthropic/claude-opus-5.5",
    provider: "Anthropic",
    name: "Claude Opus 5.5",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    provider: "Anthropic",
    name: "Claude Sonnet 5.5",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "anthropic/claude-haiku-5.5",
    provider: "Anthropic",
    name: "Claude Haiku 5.5",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "google/gemini-3.1-pro-preview",
    provider: "Google",
    name: "Gemini 3.1 Pro",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "google/gemini-3.8-flash",
    provider: "Google",
    name: "Gemini 3.8 Flash",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "google/gemini-3.5-flash-lite",
    provider: "Google",
    name: "Gemini 3.5 Flash Lite",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
  {
    id: "spacexai/grok-4.3",
    provider: "xAI",
    name: "Grok 4.3",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
    openRouterId: "x-ai/grok-4.3",
  },
  {
    id: "meta/muse-spark-1.3",
    provider: "Meta",
    name: "Muse Spark 1.3",
    capabilities: ["vision", "pdf", "reasoning"],
    openRouter: true,
  },
] as const satisfies readonly TutorModel[];

export type TutorModelId = (typeof TUTOR_MODELS)[number]["id"];

export const DEFAULT_TUTOR_MODEL: TutorModelId = TUTOR_MODELS[0].id;

export const TUTOR_REASONING_LEVELS = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
] as const;

export type TutorReasoningLevel = (typeof TUTOR_REASONING_LEVELS)[number]["id"];

export const DEFAULT_TUTOR_REASONING_LEVEL: TutorReasoningLevel = "low";

const REASONING_MODEL_IDS: ReadonlySet<TutorModelId> = new Set([
  "openai/o1",
  "openai/o3",
  "openai/gpt-5.4",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.6-terra",
  "anthropic/claude-opus-5.5",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-haiku-5.5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.8-flash",
  "google/gemini-3.5-flash-lite",
]);

export function isTutorModelId(value: unknown): value is TutorModelId {
  return typeof value === "string" && TUTOR_MODELS.some((model) => model.id === value);
}

export function isTutorModelAvailable(
  provider: "gateway" | "openrouter",
  modelId: TutorModelId,
): boolean {
  return (
    provider === "gateway" ||
    TUTOR_MODELS.some((model) => model.id === modelId && "openRouter" in model && model.openRouter)
  );
}

export function getOpenRouterModelId(modelId: string): string {
  const model: TutorModel | undefined = TUTOR_MODELS.find((model) => model.id === modelId);
  return model?.openRouterId ?? modelId;
}

export function isTutorReasoningLevel(value: unknown): value is TutorReasoningLevel {
  return typeof value === "string" && TUTOR_REASONING_LEVELS.some((level) => level.id === value);
}

export function supportsTutorReasoning(modelId: TutorModelId): boolean {
  return REASONING_MODEL_IDS.has(modelId);
}

export function supportsTutorReasoningSummary(modelId: TutorModelId): boolean {
  return supportsTutorReasoning(modelId);
}
