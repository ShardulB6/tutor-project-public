import { dbSchema } from "#/db/db-schema";
import type { NotebookId } from "#/db/schema";
import { tool } from "ai";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Buffer } from "node:buffer";
import { z } from "zod";

type ReadNotebookFileToolOptions = {
  env: Pick<Cloudflare.Env, "DB" | "TUTOR_BUCKET">;
  notebookId: NotebookId;
};

export function createReadNotebookFileTool({ env, notebookId }: ReadNotebookFileToolOptions) {
  const database = drizzle(env.DB, { schema: dbSchema });
  const fileReferenceSchema = z.object({ fileId: z.string().min(1) });

  async function findNotebookFile(fileId: string) {
    const file = await database.query.files.findFirst({
      where: (files) => and(eq(files.id, fileId), eq(files.notebookID, notebookId)),
    });
    if (!file?.storageKey) throw new Error("Notebook file not found");
    return { ...file, storageKey: file.storageKey };
  }

  return tool({
    description: "Read a file attached to the current notebook.",
    inputSchema: z.object({
      fileId: z.string().describe("The ID of the notebook file to read"),
    }),
    execute: async ({ fileId }) => {
      const file = await findNotebookFile(fileId);

      return {
        fileId: file.id,
        filename: file.title,
        mediaType: file.contentType ?? "application/octet-stream",
      };
    },
    toModelOutput: async ({ output }) => {
      // Tool results in chat history are client-controlled. Reauthorize the
      // file reference and derive its storage location from trusted metadata.
      const { fileId } = fileReferenceSchema.parse(output);
      const file = await findNotebookFile(fileId);
      const object = await env.TUTOR_BUCKET.get(file.storageKey);

      if (!object) {
        throw new Error("Notebook file content not found");
      }

      return {
        type: "content",
        value: [
          {
            type: "file-data",
            data: Buffer.from(await object.arrayBuffer()).toString("base64"),
            mediaType:
              object.httpMetadata?.contentType ?? file.contentType ?? "application/octet-stream",
            filename: file.title,
          },
        ],
      };
    },
  });
}
