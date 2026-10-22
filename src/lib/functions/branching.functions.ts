import crypto from "node:crypto";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { ChatSessionsTable, type NotebookId, SessionMessagesTable } from "#/db/schema";
import { D1SessionProvider } from "#/lib/sessions/d1-session-provider";
import { ensureNotebook } from "./ensure.function";

const MAX_THREAD_NAME_LENGTH = 60;

export const getMessageBranches = createServerOnlyFn(
  async (notebookId: NotebookId, sessionId: string, messageId: string) => {
    await ensureNotebook(notebookId);

    const sessionProvider = await D1SessionProvider.create(db, notebookId, sessionId);
    return sessionProvider.getBranches(messageId);
  },
);

export const branchServerThread = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messageId: z.string().min(1),
      notebookId: z.string().brand<"NotebookId">(),
      sessionId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await ensureNotebook(data.notebookId);

    const [sourceThread, sourceMessages] = await Promise.all([
      db.query.ChatSessionsTable.findFirst({
        where: (chatSession, { and, eq }) =>
          and(
            eq(chatSession.notebookID, data.notebookId),
            eq(chatSession.sessionID, data.sessionId),
          ),
      }),
      db
        .select()
        .from(SessionMessagesTable)
        .where(
          and(
            eq(SessionMessagesTable.notebookID, data.notebookId),
            eq(SessionMessagesTable.sessionID, data.sessionId),
          ),
        ),
    ]);

    if (!sourceThread) {
      throw new Error("Thread not found");
    }

    const messagesById = new Map(sourceMessages.map((message) => [message.id, message]));
    const branchPoint = messagesById.get(data.messageId);
    if (!branchPoint) {
      throw new Error("Message not found");
    }
    if (branchPoint.role !== "assistant") {
      throw new Error("Branches can only be created from assistant messages");
    }

    const messages = [] as typeof sourceMessages;
    const visitedMessageIds = new Set<string>();
    let currentMessage: typeof branchPoint | undefined = branchPoint;

    while (currentMessage && !visitedMessageIds.has(currentMessage.id)) {
      messages.unshift(currentMessage);
      visitedMessageIds.add(currentMessage.id);
      currentMessage = currentMessage.parentID
        ? messagesById.get(currentMessage.parentID)
        : undefined;
    }

    const sessionId = crypto.randomUUID();
    const name = `Branch ${sourceThread.name}`.slice(0, MAX_THREAD_NAME_LENGTH).trim();
    const now = new Date();

    await db.batch([
      db.insert(ChatSessionsTable).values({
        name,
        notebookID: data.notebookId,
        sessionID: sessionId,
        titleStatus: "complete",
      }),
      db.insert(SessionMessagesTable).values(
        messages.map((message) => ({
          ...message,
          notebookID: data.notebookId,
          sessionID: sessionId,
          updatedAt: now,
        })),
      ),
    ]);

    return { name, sessionId };
  });
