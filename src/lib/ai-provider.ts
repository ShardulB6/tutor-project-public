export const AI_PROVIDERS = ["gateway", "openrouter"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gateway: "Vercel AI Gateway",
  openrouter: "OpenRouter",
};

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "gateway" || value === "openrouter";
}
