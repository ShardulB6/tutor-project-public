import { createServerFn } from "@tanstack/react-start";
import { ensureAuthSession } from "../auth/auth.functions";
import { db } from "#/db";
import { files } from "#/db/file-schema";
import { NotebooksTable } from "#/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { env } from "cloudflare:workers";

import { eq, and } from "drizzle-orm";
import z from "zod";

export const getServerNotebooks = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureAuthSession();
  const notebooksResult = db
    .select()
    .from(NotebooksTable)
    .where(eq(NotebooksTable.userID, session.user.id));

  return notebooksResult;
});

export const getServerNotebook = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().brand<"NotebookId">() }))
  .handler(async ({ data }) => {
    const session = await ensureAuthSession();
    return db.query.NotebooksTable.findFirst({
      where: (notebook, { eq, and }) =>
        and(eq(notebook.id, data.id), eq(notebook.userID, session.user.id)),
    });
  });

const insertNotebookSchema = createInsertSchema(NotebooksTable)
  .pick({
    title: true,
  })
  .strip();

export const createServerNotebook = createServerFn({ method: "POST" })
  .inputValidator(insertNotebookSchema)
  .handler(async ({ data }) => {
    const session = await ensureAuthSession();

    await db.insert(NotebooksTable).values({
      title: data.title,
      userID: session.user.id,
    });
    return { success: true };
  });

export const updateServerNotebook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().brand<"NotebookId">(),
      data: insertNotebookSchema,
    }),
  )
  .handler(async ({ data }) => {
    const session = await ensureAuthSession();
    await db
      .update(NotebooksTable)
      .set(data.data)
      .where(and(eq(NotebooksTable.id, data.id), eq(NotebooksTable.userID, session.user.id)));
    return { success: true };
  });

export const deleteServerNotebook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().brand<"NotebookId">(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await ensureAuthSession();
    // Retain this deletion record if storage cleanup fails so a retry can
    // finish the operation. New uploads are rejected once this flag is set.
    const [notebook] = await db
      .update(NotebooksTable)
      .set({ isDeleting: true })
      .where(and(eq(NotebooksTable.id, data.id), eq(NotebooksTable.userID, session.user.id)))
      .returning({ id: NotebooksTable.id, userID: NotebooksTable.userID });
    if (!notebook) {
      return { success: true };
    }

    const notebookFiles = await db
      .select({ storageKey: files.storageKey })
      .from(files)
      .where(eq(files.notebookID, data.id));

    const storageKeys = notebookFiles.flatMap((file) => (file.storageKey ? [file.storageKey] : []));
    for (let offset = 0; offset < storageKeys.length; offset += 1_000) {
      await env.TUTOR_BUCKET.delete(storageKeys.slice(offset, offset + 1_000));
    }

    // Also remove objects whose upload never committed database metadata.
    // Drain the first page repeatedly instead of retaining a cursor while
    // deleting its objects. The trailing slash isolates this notebook prefix.
    const prefix = `${notebook.userID}/${notebook.id}/`;
    while (true) {
      const page = await env.TUTOR_BUCKET.list({ prefix, limit: 1_000 });
      if (page.objects.length === 0) break;
      await env.TUTOR_BUCKET.delete(page.objects.map((object) => object.key));
    }

    await db
      .delete(NotebooksTable)
      .where(and(eq(NotebooksTable.id, data.id), eq(NotebooksTable.userID, session.user.id)));

    return { success: true };
  });
