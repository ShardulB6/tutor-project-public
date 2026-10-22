"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "#/components/ui/input-group";
import { clearAiCredentials, useAiCredentials } from "#/lib/ai-credentials";
import { AI_PROVIDER_LABELS, isAiProvider } from "#/lib/ai-provider";
import { authClient } from "#/lib/auth/auth-client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings | Tutor AI" }],
  }),
});

type SaveStatus = "idle" | "saved" | "removed" | "error";

function SettingsPage() {
  const navigate = useNavigate();
  const { apiKey, provider, isLoaded, saveApiKey, removeApiKey, selectProvider } =
    useAiCredentials();
  const [draftApiKey, setDraftApiKey] = useState("");
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setDraftApiKey(isLoaded ? (apiKey ?? "") : "");
    setIsKeyVisible(false);
  }, [apiKey, isLoaded, provider]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const savedApiKey = saveApiKey(provider, draftApiKey);
      setDraftApiKey(savedApiKey);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not save the API key.");
    }
  }

  function handleRemove() {
    try {
      removeApiKey(provider);
      setDraftApiKey("");
      setIsKeyVisible(false);
      setSaveStatus("removed");
      setErrorMessage("");
    } catch {
      setSaveStatus("error");
      setErrorMessage("Could not remove the API key from this browser.");
    }
  }

  async function handleSignOut() {
    try {
      clearAiCredentials();
    } catch {
      // Browser storage can be unavailable; sign out anyway.
    }
    await authClient.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Button asChild size="icon-sm" variant="ghost">
            <Link aria-label="Back to notebooks" to="/">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-sm font-semibold">Tutor</p>
            <p className="text-xs text-muted-foreground">Settings</p>
          </div>
          <Button onClick={handleSignOut} size="sm" variant="outline">
            <LogOutIcon />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure the credential used for AI tutoring sessions on this device.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <KeyRoundIcon className="size-5" />
              </div>
              <CardTitle className="mt-2">AI provider</CardTitle>
              <CardDescription>
                Choose Vercel AI Gateway or OpenRouter, then add a key for that provider.
              </CardDescription>
              <CardAction>
                <Badge variant={apiKey ? "secondary" : "outline"}>
                  {apiKey ? (
                    <>
                      <CheckCircle2Icon />
                      Configured
                    </>
                  ) : (
                    "Not configured"
                  )}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ai-provider">Provider</FieldLabel>
                  <Select
                    disabled={!isLoaded}
                    onValueChange={(value) => {
                      if (isAiProvider(value)) {
                        try {
                          selectProvider(value);
                          setSaveStatus("idle");
                          setErrorMessage("");
                        } catch {
                          setSaveStatus("error");
                          setErrorMessage("Could not save the provider in this browser.");
                        }
                      }
                    }}
                    value={provider}
                  >
                    <SelectTrigger className="w-full" id="ai-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gateway">Vercel AI Gateway</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Tutor chat, thread titles, quizzes, and flashcards use the selected provider.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-provider-key">
                    {AI_PROVIDER_LABELS[provider]} API key
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <KeyRoundIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-describedby="ai-provider-key-description"
                      aria-invalid={saveStatus === "error"}
                      autoComplete="off"
                      disabled={!isLoaded}
                      id="ai-provider-key"
                      maxLength={4_096}
                      name="ai-provider-key"
                      onChange={(event) => {
                        setDraftApiKey(event.target.value);
                        setSaveStatus("idle");
                        setErrorMessage("");
                      }}
                      placeholder={`Paste your ${AI_PROVIDER_LABELS[provider]} API key`}
                      spellCheck={false}
                      type={isKeyVisible ? "text" : "password"}
                      value={draftApiKey}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={isKeyVisible ? "Hide API key" : "Show API key"}
                        disabled={!draftApiKey}
                        onClick={() => setIsKeyVisible((isVisible) => !isVisible)}
                        size="icon-xs"
                      >
                        {isKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription id="ai-provider-key-description">
                    Create a key in your{" "}
                    {provider === "gateway" ? "Vercel AI Gateway" : "OpenRouter"} dashboard. Read
                    the{" "}
                    <a
                      href={
                        provider === "gateway"
                          ? "https://vercel.com/docs/ai-gateway/authentication-and-byok"
                          : "https://openrouter.ai/settings/keys"
                      }
                      rel="noreferrer"
                      target="_blank"
                    >
                      setup guide <ExternalLinkIcon className="inline size-3" />
                    </a>
                    .
                  </FieldDescription>
                  {saveStatus === "error" ? (
                    <p className="text-sm text-destructive" role="alert">
                      {errorMessage}
                    </p>
                  ) : null}
                  {saveStatus === "saved" ? (
                    <p
                      className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400"
                      role="status"
                    >
                      <CheckCircle2Icon className="size-4" />
                      API key saved in this browser.
                    </p>
                  ) : null}
                  {saveStatus === "removed" ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      API key removed from this browser.
                    </p>
                  ) : null}
                </Field>

                <Alert>
                  <ShieldCheckIcon />
                  <AlertTitle>Stored only on this device</AlertTitle>
                  <AlertDescription>
                    Each key stays in this browser&apos;s local storage. The selected key is sent to
                    the server only when you use an AI feature and is not saved in the app database.
                  </AlertDescription>
                </Alert>
              </FieldGroup>
            </CardContent>

            <CardFooter className="justify-between gap-3 border-t">
              <Button
                disabled={!apiKey || !isLoaded}
                onClick={handleRemove}
                type="button"
                variant="ghost"
              >
                Remove key
              </Button>
              <Button disabled={!draftApiKey.trim() || !isLoaded} type="submit">
                Save API key
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
