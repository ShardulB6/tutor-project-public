import { Think, Session, type TurnContext } from "@cloudflare/think";
import { gateway } from "ai";
import { callable } from "agents";
import { drizzle } from "drizzle-orm/d1";
import { dbSchema } from "#/db/db-schema";
import type { NotebookId } from "#/db/schema";
import { createAiModel, getReasoningSettings } from "#/lib/ai-model.server";
import { isAiProvider, type AiProvider } from "#/lib/ai-provider";
import {
  DEFAULT_TUTOR_MODEL,
  DEFAULT_TUTOR_REASONING_LEVEL,
  isTutorModelId,
  isTutorModelAvailable,
  isTutorReasoningLevel,
} from "#/lib/models";
import { D1SessionProvider } from "#/lib/sessions/d1-session-provider";
import { createListNotebookFilesTool } from "./tools/list-notebook-files";
import { createReadNotebookFileTool } from "./tools/read-notebook-file";

export class TutorAgent extends Think<Cloudflare.Env> {
  workspaceBash = false;
  private readonly aiCredentials = new Map<
    string,
    { apiKey: string; provider: AiProvider; disposeKeepAlive: () => void; expiresAt: number }
  >();

  getModel() {
    return gateway(DEFAULT_TUTOR_MODEL);
  }

  @callable()
  async prepareAiCredential(provider: AiProvider, apiKey: string): Promise<string> {
    if (!isAiProvider(provider)) throw new Error("Select a valid AI provider.");
    if (typeof apiKey !== "string" || apiKey.length > 4_096 || !apiKey.trim()) {
      throw new Error("A valid AI provider API key is required.");
    }

    this.deleteExpiredAiCredentials();

    const credential = crypto.randomUUID();
    const disposeKeepAlive = await this.keepAlive();
    this.aiCredentials.set(credential, {
      apiKey: apiKey.trim(),
      provider,
      disposeKeepAlive,
      expiresAt: Date.now() + 60_000,
    });
    setTimeout(() => this.deleteAiCredential(credential), 60_000);

    return credential;
  }

  @callable()
  async truncateFromMessage(messageId: string): Promise<void> {
    if (typeof messageId !== "string" || !messageId) {
      throw new Error("A message id is required.");
    }

    const message = await this.session.getMessage(messageId);
    if (!message || message.role !== "assistant") {
      throw new Error("The answer to retry could not be found.");
    }

    await this.session.deleteMessages([messageId]);
  }

  override beforeTurn({ body }: TurnContext) {
    const { apiKey, provider } = this.consumeAiCredential(body?.aiCredential);
    const requestedModelId = isTutorModelId(body?.model) ? body.model : DEFAULT_TUTOR_MODEL;
    const modelId = isTutorModelAvailable(provider, requestedModelId)
      ? requestedModelId
      : DEFAULT_TUTOR_MODEL;
    const model = createAiModel(provider, apiKey, modelId);

    const reasoningLevel = isTutorReasoningLevel(body?.reasoningLevel)
      ? body.reasoningLevel
      : DEFAULT_TUTOR_REASONING_LEVEL;

    return { model, ...getReasoningSettings(provider, modelId, reasoningLevel) };
  }

  private consumeAiCredential(value: unknown): { apiKey: string; provider: AiProvider } {
    if (typeof value !== "string") {
      throw new Error("Add an AI provider API key in Settings before using the tutor.");
    }

    const credential = this.aiCredentials.get(value);
    this.deleteAiCredential(value);

    if (!credential || credential.expiresAt < Date.now()) {
      throw new Error("Your AI credential expired. Send the message again.");
    }

    return { apiKey: credential.apiKey, provider: credential.provider };
  }

  private deleteExpiredAiCredentials(): void {
    const now = Date.now();
    for (const [credential, value] of this.aiCredentials) {
      if (value.expiresAt < now) {
        this.deleteAiCredential(credential);
      }
    }
  }

  private deleteAiCredential(credential: string): void {
    const value = this.aiCredentials.get(credential);
    if (!value) {
      return;
    }

    this.aiCredentials.delete(credential);
    value.disposeKeepAlive();
  }

  getSystemPrompt() {
    return `You are a focused tutor. Explain concepts clearly, ask useful follow-up questions,
and adapt answers to the student's notebook context.

When a question depends on material in the notebook, use the notebook tools before answering:
1. Call listNotebookFiles and use filenames and user-provided topics to identify relevant files.
2. Call readNotebookFile for each relevant file ID to read its contents.
3. Base the answer on the contents returned by the tool.

If the relevant file is unclear, call listNotebookFiles and ask the student which file they mean.
Topics are file-selection hints that may be empty or incomplete, not a substitute for reading a file.
Do not claim to know a notebook file's contents unless you have read it with readNotebookFile.`;
  }

  override getTools() {
    const { notebookId } = parseAgentName(this.name);

    return {
      listNotebookFiles: createListNotebookFilesTool({ env: this.env, notebookId }),
      readNotebookFile: createReadNotebookFileTool({ env: this.env, notebookId }),
    };
  }

  override async configureSession(_session: Session): Promise<Session> {
    const { notebookId, sessionId } = parseAgentName(this.name);
    const database = drizzle(this.env.DB, { schema: dbSchema });
    const provider = await D1SessionProvider.create(database, notebookId, sessionId);

    return Session.create(provider).forSession(sessionId);
  }
}

function parseAgentName(name: string): { notebookId: NotebookId; sessionId: string } {
  const [notebookId, sessionId] = decodeURIComponent(name).split(":");

  if (!notebookId) {
    throw new Error("TutorAgent name must include a notebook id");
  }

  return {
    notebookId: notebookId as NotebookId,
    sessionId: sessionId || notebookId,
  };
}
