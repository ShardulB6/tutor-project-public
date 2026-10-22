// @vitest-environment jsdom

import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiCredentialsSessionSync, useAiCredentials } from "#/lib/ai-credentials";

const auth = vi.hoisted(() => ({
  session: { data: { user: { id: "student-a" } } } as {
    data: { user: { id: string } } | null;
    isPending?: boolean;
  },
}));
vi.mock("#/lib/auth/auth-client", () => ({
  authClient: { useSession: () => auth.session },
}));

beforeEach(() => {
  localStorage.clear();
  auth.session = { data: { user: { id: "student-a" } }, isPending: false };
});
afterEach(cleanup);

describe("browser AI credentials", () => {
  it("preserves an existing Gateway key and switches between separately saved keys", () => {
    localStorage.setItem(
      "tutor.vercel-ai-gateway-api-key",
      JSON.stringify({ userId: "student-a", apiKey: "old-gateway-key" }),
    );
    const { result } = renderHook(useAiCredentials);
    expect(result.current.apiKey).toBe("old-gateway-key");
    act(() => result.current.selectProvider("openrouter"));
    expect(result.current.apiKey).toBeNull();
    act(() => {
      result.current.saveApiKey("openrouter", "  openrouter-key  ");
    });
    expect(result.current.apiKey).toBe("openrouter-key");
    act(() => result.current.selectProvider("gateway"));
    expect(result.current.apiKey).toBe("old-gateway-key");
    act(() => result.current.selectProvider("openrouter"));
    expect(result.current.apiKey).toBe("openrouter-key");
    act(() => result.current.removeApiKey("openrouter"));
    expect(result.current.apiKey).toBeNull();
    expect(result.current.gatewayApiKey).toBe("old-gateway-key");
  });

  it("never exposes credentials from another account", () => {
    const { result, rerender } = renderHook(useAiCredentials);
    act(() => {
      result.current.saveApiKey("gateway", "gateway-key");
      result.current.saveApiKey("openrouter", "openrouter-key");
      result.current.selectProvider("openrouter");
    });
    auth.session = { data: { user: { id: "student-b" } }, isPending: false };
    rerender();
    expect(result.current.gatewayApiKey).toBeNull();
    expect(result.current.openRouterApiKey).toBeNull();
    expect(result.current.provider).toBe("gateway");
  });

  it("clears both providers' keys on logout", () => {
    const { result } = renderHook(useAiCredentials);
    act(() => {
      result.current.saveApiKey("gateway", "gateway-key");
      result.current.saveApiKey("openrouter", "openrouter-key");
      result.current.selectProvider("openrouter");
    });
    const sync = render(<AiCredentialsSessionSync />);
    auth.session = { data: null, isPending: false };
    sync.rerender(<AiCredentialsSessionSync />);
    expect(localStorage.length).toBe(0);
  });

  it("rejects empty and oversized keys without replacing a saved key", () => {
    const { result } = renderHook(useAiCredentials);
    act(() => {
      result.current.saveApiKey("openrouter", "saved-key");
    });
    expect(() => result.current.saveApiKey("openrouter", " ")).toThrow("OpenRouter API key");
    expect(() => result.current.saveApiKey("openrouter", "x".repeat(4097))).toThrow("too long");
    expect(result.current.openRouterApiKey).toBe("saved-key");
  });

  it("discards malformed and legacy unowned credentials", () => {
    localStorage.setItem("tutor.vercel-ai-gateway-api-key", "plaintext-legacy-key");
    localStorage.setItem("tutor.openrouter-api-key", JSON.stringify({ value: "unowned-key" }));
    const { result } = renderHook(useAiCredentials);
    expect(result.current.apiKey).toBeNull();
    render(<AiCredentialsSessionSync />);
    expect(localStorage.length).toBe(0);
  });
});
