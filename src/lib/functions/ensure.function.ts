import { createServerOnlyFn } from "@tanstack/react-start";
import { ensureAuthSession } from "../auth/auth.functions";
import { db } from "#/db";
import { type NotebookId } from "#/db/schema";

import { and, eq } from "drizzle-orm";

export const ensureNotebook = createServerOnlyFn(async (notebookID: NotebookId) => {
  const session = await ensureAuthSession();
  const notebooksResult = await db.query.NotebooksTable.findFirst({
    where: (NotebooksTable) =>
      and(eq(NotebooksTable.id, notebookID), eq(NotebooksTable.userID, session.user.id)),
  });
  if (notebooksResult === undefined || notebooksResult.isDeleting) {
    throw Error("unauthorized");
  }

  return notebooksResult;
});

export const ensureThread = createServerOnlyFn(
  async (notebookID: NotebookId, sessionID: string) => {
    await ensureAuthSession();
    await ensureNotebook(notebookID);

    const thread = await db.query.ChatSessionsTable.findFirst({
      where: (chatSession, { and, eq }) =>
        and(eq(chatSession.notebookID, notebookID), eq(chatSession.sessionID, sessionID)),
    });

    if (thread === undefined) {
      throw new Error("Thread not found");
    }

    return thread;
  },
);
