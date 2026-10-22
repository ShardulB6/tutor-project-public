import { db } from "#/db";
import { files } from "#/db/file-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import crypto from "node:crypto";
import { z } from "zod";
import { fileTopicsSchema, parseStoredFileTopics, serializeFileTopics } from "../file-topics";
import { ensureNotebook } from "./ensure.function";

const fileIdSchema = z.string().brand<"FileId">();
export type FileId = z.infer<typeof fileIdSchema>;

export const saveFileSchema = createServerFn({ method: "POST" })
  .inputValidator((formData: FormData) =>
    z
      .object({
        file: z.file().mime("application/pdf"),
        notebookId: z.string().brand<"NotebookId">(),
      })
      .parse({
        file: formData.get("file"),
        notebookId: formData.get("notebookId"),
      }),
  )
  .handler(async ({ data }) => {
    const notebook = await ensureNotebook(data.notebookId);

    const id = fileIdSchema.parse(crypto.randomUUID());
    const storageKey = `${notebook.userID}/${data.notebookId}/${id}`;

    await env.TUTOR_BUCKET.put(storageKey, data.file, {
      httpMetadata: {
        contentType: data.file.type,
        contentDisposition: `attachment; filename="${data.file.name.replaceAll('"', "")}"`,
      },
    });

    try {
      // The notebook may have entered deletion while the upload was in flight.
      // R2 already contains this object, so either deletion sees it or the
      // catch block below rolls it back.
      await ensureNotebook(data.notebookId);
      await db.insert(files).values({
        id,
        title: data.file.name,
        notebookID: data.notebookId,
        userID: notebook.userID,
        size: data.file.size,
        contentType: data.file.type,
        storageKey,
      });
    } catch (error) {
      await env.TUTOR_BUCKET.delete(storageKey);
      throw error;
    }

    return { id, storageKey };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      notebookId: z.string().brand<"NotebookId">(),
      fileId: fileIdSchema,
    }),
  )
  .handler(async ({ data }) => {
    await ensureNotebook(data.notebookId);
    const file = await db.query.files.findFirst({
      where: (files) => and(eq(files.id, data.fileId), eq(files.notebookID, data.notebookId)),
    });
    if (!file) {
      throw new Error("File not found");
    }

    if (file.storageKey) {
      await env.TUTOR_BUCKET.delete(file.storageKey);
    }

    await db
      .delete(files)
      .where(and(eq(files.id, data.fileId), eq(files.notebookID, data.notebookId)));

    return { success: true };
  });

export const updateFileTopics = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      notebookId: z.string().brand<"NotebookId">(),
      fileId: fileIdSchema,
      topics: fileTopicsSchema,
    }),
  )
  .handler(async ({ data }) => {
    await ensureNotebook(data.notebookId);

    const [updatedFile] = await db
      .update(files)
      .set({ topics: serializeFileTopics(data.topics) })
      .where(and(eq(files.id, data.fileId), eq(files.notebookID, data.notebookId)))
      .returning({ topics: files.topics });

    if (!updatedFile) {
      throw new Error("File not found");
    }

    return { topics: parseStoredFileTopics(updatedFile.topics) };
  });

export const getFiles = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      notebookId: z.string().brand<"NotebookId">(),
    }),
  )
  .handler(async ({ data }) => {
    await ensureNotebook(data.notebookId);

    const notebookFiles = await db
      .select({
        id: files.id,
        title: files.title,
        notebookID: files.notebookID,
        size: files.size,
        contentType: files.contentType,
        storageKey: files.storageKey,
        topics: files.topics,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(eq(files.notebookID, data.notebookId))
      .orderBy(desc(files.createdAt));

    return notebookFiles.map((file) => ({
      ...file,
      id: fileIdSchema.parse(file.id),
      topics: parseStoredFileTopics(file.topics),
    }));
  });
