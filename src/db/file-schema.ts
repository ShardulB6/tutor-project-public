import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import * as authSchema from "./auth-schema";
import { timestampColumns, NotebooksTable } from "./schema";
export * from "./auth-schema";

export const files = sqliteTable("files", {
  title: text().notNull(),
  id: text("id").notNull(),
  notebookID: text("notebook_id")
    .references(() => NotebooksTable.id, { onDelete: "cascade" })
    .notNull(),
  userID: text("userID")
    .references(() => authSchema.user.id)
    .notNull(),
  size: integer("size"),
  contentType: text("content_type"),
  storageKey: text("storage_key"),
  topics: text("topics").default("[]").notNull(),

  ...timestampColumns,
});
