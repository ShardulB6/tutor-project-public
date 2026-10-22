"use client";

import { useEffect, useSyncExternalStore } from "react";
import { authClient } from "./auth/auth-client";
import { AI_PROVIDER_LABELS, isAiProvider, type AiProvider } from "./ai-provider";

const STORAGE_KEYS = {
  gateway: "tutor.vercel-ai-gateway-api-key",
  openrouter: "tutor.openrouter-api-key",
  provider: "tutor.ai-provider",
} as const;
const CHANGE_EVENT = "tutor:ai-credentials-change";
const MAX_API_KEY_LENGTH = 4_096;

function readStoredValue(key: string): { userId: string; value: string } | null {
  const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
  if (!stored || typeof stored !== "object" || !("userId" in stored)) return null;
  if (typeof stored.userId !== "string") return null;

  // The existing Gateway key uses `apiKey`; preserve it across this upgrade.
  if ("apiKey" in stored && typeof stored.apiKey === "string") {
    return { userId: stored.userId, value: stored.apiKey };
  }
  if ("value" in stored && typeof stored.value === "string") {
    return { userId: stored.userId, value: stored.value };
  }
  return null;
}

function getSnapshot(key: string, userId: string | null): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const stored = readStoredValue(key);
    return stored?.userId === userId ? stored.value : null;
  } catch {
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || Object.values(STORAGE_KEYS).some((key) => key === event.key)) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToHydration(): () => void {
  return () => undefined;
}

function writeStoredValue(key: string, userId: string, value: string): void {
  window.localStorage.setItem(key, JSON.stringify({ userId, value }));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function removeStoredValue(key: string): void {
  window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearAiCredentials(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeStoredValue(key);
}

export function AiCredentialsSessionSync() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (isPending) return;
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        try {
          const owner = readStoredValue(key)?.userId;
          if ((!userId || owner !== userId) && window.localStorage.getItem(key) !== null) {
            removeStoredValue(key);
          }
        } catch {
          removeStoredValue(key);
        }
      }
    } catch {
      // Storage can be disabled; reads fail closed.
    }
  }, [isPending, userId]);
  return null;
}

export function useAiCredentials(): {
  provider: AiProvider;
  apiKey: string | null;
  gatewayApiKey: string | null;
  openRouterApiKey: string | null;
  isLoaded: boolean;
  selectProvider: (provider: AiProvider) => void;
  saveApiKey: (provider: AiProvider, apiKey: string) => string;
  removeApiKey: (provider: AiProvider) => void;
} {
  const { data: session, isPending } = authClient.useSession();
  const userId = isPending ? null : (session?.user.id ?? null);
  const gatewayApiKey = useSyncExternalStore(
    subscribe,
    () => getSnapshot(STORAGE_KEYS.gateway, userId),
    () => null,
  );
  const openRouterApiKey = useSyncExternalStore(
    subscribe,
    () => getSnapshot(STORAGE_KEYS.openrouter, userId),
    () => null,
  );
  const storedProvider = useSyncExternalStore(
    subscribe,
    () => getSnapshot(STORAGE_KEYS.provider, userId),
    () => null,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const provider = isAiProvider(storedProvider) ? storedProvider : "gateway";

  return {
    provider,
    apiKey: provider === "gateway" ? gatewayApiKey : openRouterApiKey,
    gatewayApiKey,
    openRouterApiKey,
    isLoaded: isHydrated && !isPending,
    selectProvider: (value) => {
      if (!userId) throw new Error("Sign in before selecting an AI provider.");
      writeStoredValue(STORAGE_KEYS.provider, userId, value);
    },
    saveApiKey: (value, apiKey) => {
      if (!userId) throw new Error("Sign in before saving an API key.");
      const normalized = apiKey.trim();
      if (!normalized) throw new Error(`Enter your ${AI_PROVIDER_LABELS[value]} API key.`);
      if (normalized.length > MAX_API_KEY_LENGTH) throw new Error("The API key is too long.");
      writeStoredValue(STORAGE_KEYS[value], userId, normalized);
      return normalized;
    },
    removeApiKey: (value) => removeStoredValue(STORAGE_KEYS[value]),
  };
}
