import { foreignKey, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import {
  ChatSessionsTable,
  NotebooksTable,
  TITLE_STATUSES,
  timestampColumns,
  type NotebookId,
} from "./schema";

export type QuizId = string & z.$brand<"QuizId">;
export type FlashcardsId = string & z.$brand<"FlashcardsId">;

export type QuizQuestion = {
  type: "multiple-choice";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
};

export type Flashcard = {
  front: string;
  back: string;
};

// Keep the physical table name so existing generated material remains available.
export const quizzesTable = sqliteTable(
  "exams",
  {
    id: text("id").$type<QuizId>().primaryKey(),
    notebookID: text("notebook_id")
      .$type<NotebookId>()
      .references(() => NotebooksTable.id, { onDelete: "cascade" })
      .notNull(),
    sessionID: text("session_id").notNull(),
    title: text("title").notNull(),
    questions: text("questions", { mode: "json" }).$type<QuizQuestion[]>().notNull(),
    sourceFileIds: text("source_file_ids", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    model: text("model"),
    error: text("error"),
    schemaVersion: integer("schema_version").default(1).notNull(),
    status: text("title_status", { enum: TITLE_STATUSES }).default("pending").notNull(),
    ...timestampColumns,
  },
  (table) => ({
    notebookSessionFK: foreignKey({
      columns: [table.notebookID, table.sessionID],
      foreignColumns: [ChatSessionsTable.notebookID, ChatSessionsTable.sessionID],
    }).onDelete("cascade"),
  }),
);

export const flashcardsTable = sqliteTable(
  "flashcards",
  {
    id: text("id").$type<FlashcardsId>().primaryKey(),
    notebookID: text("notebook_id")
      .$type<NotebookId>()
      .references(() => NotebooksTable.id, { onDelete: "cascade" })
      .notNull(),
    sessionID: text("session_id").notNull(),
    title: text("title").notNull(),
    cards: text("cards", { mode: "json" }).$type<Flashcard[]>().notNull(),
    sourceFileIds: text("source_file_ids", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    model: text("model"),
    error: text("error"),
    schemaVersion: integer("schema_version").default(1).notNull(),
    status: text("title_status", { enum: TITLE_STATUSES }).default("pending").notNull(),
    ...timestampColumns,
  },
  (table) => ({
    notebookSessionFK: foreignKey({
      columns: [table.notebookID, table.sessionID],
      foreignColumns: [ChatSessionsTable.notebookID, ChatSessionsTable.sessionID],
    }).onDelete("cascade"),
  }),
);
