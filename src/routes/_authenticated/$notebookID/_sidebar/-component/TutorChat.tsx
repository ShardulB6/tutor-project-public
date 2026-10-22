"use client";

import { useAgentChat } from "@cloudflare/ai-chat/react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAgent } from "agents/react";
import {
  BotIcon,
  BrainIcon,
  GitBranchIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "#/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "#/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
} from "#/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "#/components/ai-elements/reasoning";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import type { NotebookId } from "#/db/schema";
import { useAiCredentials } from "#/lib/ai-credentials";
import { AI_PROVIDER_LABELS } from "#/lib/ai-provider";
import {
  DEFAULT_TUTOR_MODEL,
  DEFAULT_TUTOR_REASONING_LEVEL,
  isTutorModelId,
  isTutorModelAvailable,
  isTutorReasoningLevel,
  supportsTutorReasoning,
  TUTOR_MODELS,
  TUTOR_REASONING_LEVELS,
  type TutorModelId,
  type TutorReasoningLevel,
} from "#/lib/models";
import { branchServerThread } from "#/lib/functions/branching.functions";
import { generateServerThreadTitle } from "#/lib/functions/threads.function";
import { cn } from "#/lib/utils";
import { TutorModelSelector } from "./TutorModelSelector";

type TutorChatProps = {
  notebookID: NotebookId;
  sessionID: string;
};

type RetryRequest = {
  messageId: string;
  modelId: TutorModelId;
  reasoningLevel: TutorReasoningLevel;
};

type ChatActionError = {
  description: string;
  title: string;
};

const RETRY_REQUEST_STORAGE_PREFIX = "tutor-retry-request";

function getRetryRequestStorageKey(sessionId: string): string {
  return `${RETRY_REQUEST_STORAGE_PREFIX}:${sessionId}`;
}

function isRetryRequest(value: unknown): value is RetryRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Record<string, unknown>;
  return (
    typeof request.messageId === "string" &&
    isTutorModelId(request.modelId) &&
    isTutorReasoningLevel(request.reasoningLevel)
  );
}

const TYPING_DOT_DELAYS = [
  "[animation-delay:0ms]",
  "[animation-delay:150ms]",
  "[animation-delay:300ms]",
];

function TypingIndicator() {
  return (
    <div aria-label="Tutor is responding" className="flex items-center gap-1 py-2" role="status">
      {TYPING_DOT_DELAYS.map((delay) => (
        <span
          className={cn("size-2 animate-bounce rounded-full bg-muted-foreground", delay)}
          key={delay}
        />
      ))}
    </div>
  );
}

export function TutorChat({ notebookID, sessionID }: TutorChatProps) {
  const router = useRouter();
  const branchThread = useServerFn(branchServerThread);
  const generateThreadTitle = useServerFn(generateServerThreadTitle);
  const { apiKey, provider, isLoaded: isApiKeyLoaded } = useAiCredentials();
  const [selectedModelId, setSelectedModelId] = useState<TutorModelId>(DEFAULT_TUTOR_MODEL);
  const [selectedReasoningLevel, setSelectedReasoningLevel] = useState<TutorReasoningLevel>(
    DEFAULT_TUTOR_REASONING_LEVEL,
  );
  const [retryDialogMessageId, setRetryDialogMessageId] = useState<string | null>(null);
  const [retryModelId, setRetryModelId] = useState<TutorModelId>(DEFAULT_TUTOR_MODEL);
  const [retryReasoningLevel, setRetryReasoningLevel] = useState<TutorReasoningLevel>(
    DEFAULT_TUTOR_REASONING_LEVEL,
  );
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [branchingMessageId, setBranchingMessageId] = useState<string | null>(null);
  const [chatActionError, setChatActionError] = useState<ChatActionError | null>(null);
  const agent = useAgent({
    agent: "TutorAgent",
    name: `${notebookID}:${sessionID}`,
  });
  const { messages, sendMessage, setMessages, status, stop } = useAgentChat({
    agent,
    prepareSendMessagesRequest: async () => {
      if (!apiKey) {
        throw new Error(
          `Add your ${AI_PROVIDER_LABELS[provider]} API key in Settings before using the tutor.`,
        );
      }

      const aiCredential = await agent.call<string>("prepareAiCredential", [provider, apiKey]);

      return {
        body: {
          aiCredential,
          model: selectedModelId,
          reasoningLevel: selectedReasoningLevel,
        },
      };
    },
  });
  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  // Show the typing dots until the tutor's answer has visible text or reasoning.
  const isWaitingForResponse =
    isBusy &&
    !(
      lastMessage?.role === "assistant" &&
      lastMessage.parts.some(
        (part) => (part.type === "text" || part.type === "reasoning") && part.text,
      )
    );
  const canUseAI = isApiKeyLoaded && Boolean(apiKey);
  const availableModels = TUTOR_MODELS.filter((model) => isTutorModelAvailable(provider, model.id));
  const selectedModel =
    availableModels.find((model) => model.id === selectedModelId) ?? TUTOR_MODELS[0];
  const providers = [...new Set(availableModels.map((model) => model.provider))];
  const isRetryingOlderMessage =
    retryDialogMessageId !== null && messages[messages.length - 1]?.id !== retryDialogMessageId;

  useEffect(() => {
    if (!isTutorModelAvailable(provider, selectedModelId)) {
      setSelectedModelId(DEFAULT_TUTOR_MODEL);
    }
    if (!isTutorModelAvailable(provider, retryModelId)) {
      setRetryModelId(DEFAULT_TUTOR_MODEL);
    }
  }, [provider, retryModelId, selectedModelId]);

  const retryAssistantMessage = useCallback(
    async (messageId: string, modelId: TutorModelId, reasoningLevel: TutorReasoningLevel) => {
      const messageIndex = messages.findIndex((message) => message.id === messageId);
      if (messageIndex === -1 || messages[messageIndex]?.role !== "assistant") {
        throw new Error("The answer to retry could not be found.");
      }

      await agent.call("truncateFromMessage", [messageId]);

      setMessages((currentMessages) => {
        const currentMessageIndex = currentMessages.findIndex(
          (message) => message.id === messageId,
        );
        return currentMessageIndex === -1
          ? currentMessages
          : currentMessages.slice(0, currentMessageIndex);
      });

      await sendMessage(undefined, {
        body: {
          model: modelId,
          reasoningLevel,
        },
      });
    },
    [agent, messages, sendMessage, setMessages],
  );

  useEffect(() => {
    if (!canUseAI || isBusy || retryingMessageId !== null) {
      return;
    }

    const storageKey = getRetryRequestStorageKey(sessionID);
    const storedRequest = sessionStorage.getItem(storageKey);
    if (!storedRequest) {
      return;
    }

    let retryRequest: RetryRequest;
    try {
      const parsedRequest: unknown = JSON.parse(storedRequest);
      if (!isRetryRequest(parsedRequest)) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      retryRequest = parsedRequest;
    } catch {
      sessionStorage.removeItem(storageKey);
      return;
    }

    const retryMessage = messages.find((message) => message.id === retryRequest.messageId);
    if (!retryMessage) {
      return;
    }
    if (retryMessage.role !== "assistant") {
      sessionStorage.removeItem(storageKey);
      setChatActionError({
        description: "The answer to retry could not be found in the branched chat.",
        title: "Retry failed",
      });
      return;
    }

    sessionStorage.removeItem(storageKey);
    setSelectedModelId(retryRequest.modelId);
    setSelectedReasoningLevel(retryRequest.reasoningLevel);
    setRetryingMessageId(retryRequest.messageId);
    setChatActionError(null);

    void retryAssistantMessage(
      retryRequest.messageId,
      retryRequest.modelId,
      retryRequest.reasoningLevel,
    )
      .catch(() => {
        setChatActionError({
          description: "Could not retry the answer in the branched chat. Try again.",
          title: "Retry failed",
        });
      })
      .finally(() => {
        setRetryingMessageId(null);
      });
  }, [canUseAI, isBusy, messages, retryAssistantMessage, retryingMessageId, sessionID]);

  function openRetryDialog(messageId: string) {
    const alternativeModel =
      availableModels.find((model) => model.id !== selectedModelId)?.id ?? selectedModelId;

    setRetryModelId(alternativeModel);
    setRetryReasoningLevel(selectedReasoningLevel);
    setRetryDialogMessageId(messageId);
  }

  async function retryMessage(messageId: string) {
    setRetryDialogMessageId(null);
    setRetryingMessageId(messageId);
    setChatActionError(null);

    try {
      const isLatestMessage = messages[messages.length - 1]?.id === messageId;
      if (isLatestMessage) {
        setSelectedModelId(retryModelId);
        setSelectedReasoningLevel(retryReasoningLevel);
        await retryAssistantMessage(messageId, retryModelId, retryReasoningLevel);
        return;
      }

      const branch = await branchThread({
        data: {
          messageId,
          notebookId: notebookID,
          sessionId: sessionID,
        },
      });
      const retryRequest = {
        messageId,
        modelId: retryModelId,
        reasoningLevel: retryReasoningLevel,
      } satisfies RetryRequest;
      sessionStorage.setItem(
        getRetryRequestStorageKey(branch.sessionId),
        JSON.stringify(retryRequest),
      );

      await router.invalidate();
      await router.navigate({
        params: { notebookID, chatID: branch.sessionId },
        to: "/$notebookID/$chatID",
      });
    } catch {
      setChatActionError({
        description: "Could not retry this answer. Try again.",
        title: "Retry failed",
      });
    } finally {
      setRetryingMessageId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask a question about the material in this notebook."
              icon={<BotIcon className="size-6" />}
              title="Start a tutoring session"
            />
          ) : (
            messages.map((message) => {
              const textParts = message.parts.filter((part) => part.type === "text");
              const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
              const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
              const isReasoningStreaming = reasoningParts.some(
                (part) => part.state === "streaming",
              );

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.role === "assistant" && reasoningText ? (
                      <Card className="mb-2 gap-0 overflow-hidden border-0 py-0 shadow-none">
                        <Reasoning className="mb-0" isStreaming={isReasoningStreaming}>
                          <ReasoningTrigger
                            className="px-3 py-2.5"
                            getThinkingMessage={(isStreaming) =>
                              isStreaming
                                ? "Generating reasoning summary..."
                                : "Reasoning summary for this answer"
                            }
                          />
                          <ReasoningContent className="mt-0 border-t bg-muted/30 px-3 py-3">
                            {reasoningText}
                          </ReasoningContent>
                        </Reasoning>
                      </Card>
                    ) : null}
                    {textParts.map((part, index) => (
                      <MessageResponse
                        isAnimating={status === "streaming"}
                        key={`${message.id}-text-${index}`}
                      >
                        {part.text}
                      </MessageResponse>
                    ))}
                  </MessageContent>
                  {message.role === "assistant" ? (
                    <MessageActions className={cn("transition-opacity")}>
                      <MessageAction
                        disabled={
                          isBusy || branchingMessageId !== null || retryingMessageId !== null
                        }
                        label="Branch in new chat"
                        tooltip="Branch in new chat"
                        onClick={async () => {
                          setChatActionError(null);
                          setBranchingMessageId(message.id);

                          try {
                            const branch = await branchThread({
                              data: {
                                messageId: message.id,
                                notebookId: notebookID,
                                sessionId: sessionID,
                              },
                            });
                            await router.invalidate();
                            await router.navigate({
                              params: { notebookID, chatID: branch.sessionId },
                              to: "/$notebookID/$chatID",
                            });
                          } catch {
                            setChatActionError({
                              description: "Could not create the branch. Try again.",
                              title: "Branching failed",
                            });
                          } finally {
                            setBranchingMessageId(null);
                          }
                        }}
                      >
                        {branchingMessageId === message.id ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <GitBranchIcon />
                        )}
                      </MessageAction>
                      <MessageAction
                        disabled={
                          isBusy ||
                          !canUseAI ||
                          branchingMessageId !== null ||
                          retryingMessageId !== null
                        }
                        label="Retry with another model"
                        onClick={() => openRetryDialog(message.id)}
                        tooltip="Retry with another model"
                      >
                        {retryingMessageId === message.id ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <RotateCcwIcon />
                        )}
                      </MessageAction>
                    </MessageActions>
                  ) : null}
                </Message>
              );
            })
          )}
          {isWaitingForResponse ? <TypingIndicator /> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-4">
        {chatActionError ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>{chatActionError.title}</AlertTitle>
            <AlertDescription>{chatActionError.description}</AlertDescription>
          </Alert>
        ) : null}
        {isApiKeyLoaded && !apiKey ? (
          <Alert>
            <KeyRoundIcon />
            <AlertTitle>Add your {AI_PROVIDER_LABELS[provider]} key to start chatting</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Your key is stored locally in this browser and is required for the selected
                provider.
              </span>
              <Button asChild size="sm">
                <Link to="/settings">Open settings</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <PromptInput
          className="rounded-xl bg-background shadow-sm"
          onSubmit={async ({ text }) => {
            const trimmedText = text.trim();
            if (!trimmedText || isBusy || !apiKey) {
              return;
            }

            const isNewThread = messages.length === 0;

            const sendMessagePromise = sendMessage({
              role: "user",
              parts: [{ type: "text", text: trimmedText }],
            });

            if (isNewThread) {
              await Promise.all([
                sendMessagePromise,
                generateThreadTitle({
                  data: {
                    apiKey,
                    provider,
                    notebookId: notebookID,
                    question: trimmedText,
                    sessionId: sessionID,
                  },
                }).catch(() => undefined),
              ]);
              await router.invalidate();
              return;
            }

            await sendMessagePromise;
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="Message your tutor"
              disabled={isBusy || !canUseAI}
              placeholder={canUseAI ? "Ask your tutor..." : "Add an API key in Settings to chat"}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="flex min-w-0 items-center gap-1">
              <TutorModelSelector
                disabled={isBusy || !canUseAI}
                models={availableModels}
                onSelect={setSelectedModelId}
                selectedModel={selectedModel}
              />
              {supportsTutorReasoning(selectedModelId) ? (
                <PromptInputSelect
                  disabled={isBusy || !canUseAI}
                  onValueChange={(value) => {
                    if (isTutorReasoningLevel(value)) {
                      setSelectedReasoningLevel(value);
                    }
                  }}
                  value={selectedReasoningLevel}
                >
                  <PromptInputSelectTrigger
                    aria-label={`Select reasoning level. Current level: ${selectedReasoningLevel}`}
                    className="h-8 gap-1 px-2"
                  >
                    <BrainIcon className="size-3.5" />
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {TUTOR_REASONING_LEVELS.map((level) => (
                      <PromptInputSelectItem key={level.id} value={level.id}>
                        {level.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              ) : null}
              <span
                className={cn(
                  "hidden px-2 text-xs text-muted-foreground sm:inline",
                  status === "error" && "text-destructive",
                )}
              >
                {!canUseAI
                  ? "API key required"
                  : status === "error"
                    ? "Message failed. Check your key and try again."
                    : "Enter to send"}
              </span>
            </div>
            <PromptInputSubmit disabled={!canUseAI} onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRetryDialogMessageId(null);
          }
        }}
        open={retryDialogMessageId !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry with another model</DialogTitle>
            <DialogDescription>
              {isRetryingOlderMessage
                ? "Choose a model for the new answer. This older answer will be retried in a new branched chat."
                : "Choose a model for a new answer to the same question."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="retry-model">Model</Label>
              <Select
                onValueChange={(value) => {
                  if (isTutorModelId(value)) {
                    setRetryModelId(value);
                  }
                }}
                value={retryModelId}
              >
                <SelectTrigger className="w-full" id="retry-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((modelProvider) => (
                    <SelectGroup key={modelProvider}>
                      <SelectLabel>{modelProvider}</SelectLabel>
                      {availableModels
                        .filter((model) => model.provider === modelProvider)
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supportsTutorReasoning(retryModelId) ? (
              <div className="grid gap-2">
                <Label htmlFor="retry-reasoning-level">Reasoning level</Label>
                <Select
                  onValueChange={(value) => {
                    if (isTutorReasoningLevel(value)) {
                      setRetryReasoningLevel(value);
                    }
                  }}
                  value={retryReasoningLevel}
                >
                  <SelectTrigger className="w-full" id="retry-reasoning-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTOR_REASONING_LEVELS.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={retryDialogMessageId === null}
              onClick={() => {
                if (retryDialogMessageId) {
                  void retryMessage(retryDialogMessageId);
                }
              }}
            >
              {isRetryingOlderMessage ? "Retry in new branch" : "Retry answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
