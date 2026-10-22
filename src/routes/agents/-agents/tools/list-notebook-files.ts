import { dbSchema } from "#/db/db-schema";
import type { NotebookId } from "#/db/schema";
import { parseStoredFileTopics } from "#/lib/file-topics";
import { tool } from "ai";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";

type ListNotebookFilesToolOptions = {
  env: Pick<Cloudflare.Env, "DB">;
  notebookId: NotebookId;
};

export function createListNotebookFilesTool({ env, notebookId }: ListNotebookFilesToolOptions) {
  const database = drizzle(env.DB, { schema: dbSchema });

  return tool({
    description:
      "List the files attached to the current notebook, including user-provided topics. Use filenames and topics as hints to identify relevant files, then read each relevant file by ID.",
    inputSchema: z.object({}),
    execute: async () => {
      const files = await database.query.files.findMany({
        columns: {
          id: true,
          title: true,
          contentType: true,
          size: true,
          topics: true,
        },
        where: (files) => eq(files.notebookID, notebookId),
        orderBy: (files) => desc(files.createdAt),
      });

      return files.map((file) => ({
        ...file,
        topics: parseStoredFileTopics(file.topics),
      }));
    },
  });
}
