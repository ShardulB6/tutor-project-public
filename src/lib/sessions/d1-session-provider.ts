import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import type {
  SearchResult,
  SessionMessage,
  SessionProvider,
  StoredCompaction,
} from "agents/experimental/memory/session";
import { SessionCompactionsTable, SessionMessagesTable } from "#/db/schema";
import type { NotebookId } from "#/db/schema";
import type { db } from "#/db";

export type Database = typeof db;

type SessionMessageRow = typeof SessionMessagesTable.$inferSelect;
type CompactionRow = typeof SessionCompactionsTable.$inferSelect;

export class D1SessionProvider implements SessionProvider {
  private readonly messages = new Map<string, SessionMessageRow>();
  private readonly compactions = new Map<string, CompactionRow>();
  private persistQueue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly database: Database,
    private readonly notebookId: NotebookId,
    private readonly sessionId: string,
  ) {}

  static async create(
    database: Database,
    notebookId: NotebookId,
    sessionId: string,
  ): Promise<D1SessionProvider> {
    const provider = new D1SessionProvider(database, notebookId, sessionId);
    await provider.hydrate();
    return provider;
  }

  getMessage(id: string): SessionMessage | null {
    const row = this.messages.get(id);
    return row ? this.parseMessage(row.content) : null;
  }

  getHistory(leafId?: string | null): SessionMessage[] {
    const leaf = leafId ? this.messages.get(leafId) : this.findLatestLeaf();
    if (!leaf) return [];

    const rows: SessionMessageRow[] = [];
    const seen = new Set<string>();
    let current: SessionMessageRow | undefined = leaf;

    while (current && !seen.has(current.id)) {
      rows.unshift(current);
      seen.add(current.id);
      current = current.parentID ? this.messages.get(current.parentID) : undefined;
    }

    const messages = rows
      .map((row) => this.parseMessage(row.content))
      .filter((message): message is SessionMessage => message !== null);

    return this.compactions.size > 0
      ? this.applyCompactions(messages, this.getCompactions())
      : messages;
  }

  getLatestLeaf(): SessionMessage | null {
    const row = this.findLatestLeaf();
    return row ? this.parseMessage(row.content) : null;
  }

  getBranches(messageId: string): SessionMessage[] {
    return [...this.messages.values()]
      .filter((row) => row.parentID === messageId)
      .sort((a, b) => this.compareRowsAsc(a, b))
      .map((row) => this.parseMessage(row.content))
      .filter((message): message is SessionMessage => message !== null);
  }

  getPathLength(leafId?: string | null): number {
    const leaf = leafId ? this.messages.get(leafId) : this.findLatestLeaf();
    if (!leaf) return 0;

    let count = 0;
    const seen = new Set<string>();
    let current: SessionMessageRow | undefined = leaf;

    while (current && !seen.has(current.id)) {
      count += 1;
      seen.add(current.id);
      current = current.parentID ? this.messages.get(current.parentID) : undefined;
    }

    return count;
  }

  appendMessage(message: SessionMessage, parentId?: string | null): void {
    if (this.messages.has(message.id)) return;

    let parent = parentId !== undefined ? parentId : (this.findLatestLeaf()?.id ?? null);

    if (parent && !this.messages.has(parent)) {
      parent = null;
    }

    const now = new Date();
    const row: SessionMessageRow = {
      notebookID: this.notebookId,
      sessionID: this.sessionId,
      id: message.id,
      parentID: parent,
      role: message.role,
      content: JSON.stringify(message),
      textContent: this.extractSearchableText(message),
      createdAt: now,
      updatedAt: now,
    };

    this.messages.set(row.id, row);
    this.enqueue(() =>
      this.database
        .insert(SessionMessagesTable)
        .values(row)
        .onConflictDoNothing()
        .then(() => undefined),
    );
  }

  updateMessage(message: SessionMessage): void {
    const existing = this.messages.get(message.id);
    if (!existing) return;

    const now = new Date();
    const row: SessionMessageRow = {
      ...existing,
      role: message.role,
      content: JSON.stringify(message),
      textContent: this.extractSearchableText(message),
      updatedAt: now,
    };

    this.messages.set(row.id, row);
    this.enqueue(() =>
      this.database
        .update(SessionMessagesTable)
        .set({
          content: row.content,
          textContent: row.textContent,
          updatedAt: row.updatedAt,
        })
        .where(
          and(
            eq(SessionMessagesTable.notebookID, this.notebookId),
            eq(SessionMessagesTable.sessionID, this.sessionId),
            eq(SessionMessagesTable.id, row.id),
          ),
        )
        .then(() => undefined),
    );
  }

  deleteMessages(messageIds: string[]): void {
    for (const id of messageIds) {
      this.messages.delete(id);
      this.enqueue(() =>
        this.database
          .delete(SessionMessagesTable)
          .where(
            and(
              eq(SessionMessagesTable.notebookID, this.notebookId),
              eq(SessionMessagesTable.sessionID, this.sessionId),
              eq(SessionMessagesTable.id, id),
            ),
          )
          .then(() => undefined),
      );
    }
  }

  clearMessages(): void {
    this.messages.clear();
    this.compactions.clear();
    this.enqueue(() =>
      this.database
        .delete(SessionMessagesTable)
        .where(
          and(
            eq(SessionMessagesTable.notebookID, this.notebookId),
            eq(SessionMessagesTable.sessionID, this.sessionId),
          ),
        )
        .then(() => undefined),
    );
    this.enqueue(() =>
      this.database
        .delete(SessionCompactionsTable)
        .where(
          and(
            eq(SessionCompactionsTable.notebookID, this.notebookId),
            eq(SessionCompactionsTable.sessionID, this.sessionId),
          ),
        )
        .then(() => undefined),
    );
  }

  addCompaction(summary: string, fromMessageId: string, toMessageId: string): StoredCompaction {
    const id = crypto.randomUUID();
    const now = new Date();

    const row: CompactionRow = {
      notebookID: this.notebookId,
      sessionID: this.sessionId,
      id,
      summary,
      fromMessageID: fromMessageId,
      toMessageID: toMessageId,
      createdAt: now,
      updatedAt: now,
    };

    this.compactions.set(id, row);
    this.enqueue(() =>
      this.database
        .insert(SessionCompactionsTable)
        .values(row)
        .then(() => undefined),
    );

    return {
      id,
      summary,
      fromMessageId,
      toMessageId,
      createdAt: now.toISOString(),
    };
  }

  getCompactions(): StoredCompaction[] {
    return [...this.compactions.values()]
      .sort((a, b) => this.compareCompactionsAsc(a, b))
      .map((row) => ({
        id: row.id,
        summary: row.summary,
        fromMessageId: row.fromMessageID,
        toMessageId: row.toMessageID,
        createdAt:
          row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      }));
  }

  searchMessages(query: string, limit = 20): SearchResult[] {
    const terms = query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    if (terms.length === 0) return [];

    return [...this.messages.values()]
      .filter((row) => terms.every((term) => row.textContent.includes(term)))
      .sort((a, b) => this.compareRowsDesc(a, b))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        role: row.role,
        content: row.textContent,
        createdAt: "",
      }));
  }

  private async hydrate(): Promise<void> {
    const [messageRows, compactionRows] = await Promise.all([
      this.database
        .select()
        .from(SessionMessagesTable)
        .where(
          and(
            eq(SessionMessagesTable.notebookID, this.notebookId),
            eq(SessionMessagesTable.sessionID, this.sessionId),
          ),
        ),
      this.database
        .select()
        .from(SessionCompactionsTable)
        .where(
          and(
            eq(SessionCompactionsTable.notebookID, this.notebookId),
            eq(SessionCompactionsTable.sessionID, this.sessionId),
          ),
        ),
    ]);

    for (const row of messageRows) {
      this.messages.set(row.id, row);
    }

    for (const row of compactionRows) {
      this.compactions.set(row.id, row);
    }
  }

  private findLatestLeaf(): SessionMessageRow | undefined {
    const parentIds = new Set(
      [...this.messages.values()]
        .map((row) => row.parentID)
        .filter((parentID): parentID is string => Boolean(parentID)),
    );

    return [...this.messages.values()]
      .sort((a, b) => this.compareRowsDesc(a, b))
      .find((row) => !parentIds.has(row.id));
  }

  private applyCompactions(
    messages: SessionMessage[],
    compactions: StoredCompaction[],
  ): SessionMessage[] {
    const ids = messages.map((message) => message.id);
    const result: SessionMessage[] = [];
    let index = 0;

    while (index < messages.length) {
      const matches = compactions.filter((compaction) => compaction.fromMessageId === ids[index]);
      const compaction = matches.at(-1);

      if (compaction) {
        const endIndex = ids.indexOf(compaction.toMessageId);
        if (endIndex >= index) {
          result.push({
            id: `compaction_${compaction.id}`,
            role: "assistant",
            parts: [{ type: "text", text: compaction.summary }],
            createdAt: new Date(),
          });
          index = endIndex + 1;
          continue;
        }
      }

      result.push(messages[index]);
      index += 1;
    }

    return result;
  }

  private parseMessage(json: string): SessionMessage | null {
    try {
      const value = JSON.parse(json);
      if (
        typeof value?.id === "string" &&
        typeof value?.role === "string" &&
        Array.isArray(value?.parts)
      ) {
        return value;
      }
    } catch {
      return null;
    }

    return null;
  }

  private extractSearchableText(message: SessionMessage): string {
    return message.parts
      .filter((part) => part.type === "text" && "text" in part)
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }

  private enqueue(work: () => Promise<void>): void {
    this.persistQueue = this.persistQueue.then(work).catch(() => undefined);
  }

  private compareRowsAsc(a: SessionMessageRow, b: SessionMessageRow): number {
    const aTime =
      a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const bTime =
      b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return aTime - bTime || a.id.localeCompare(b.id);
  }

  private compareRowsDesc(a: SessionMessageRow, b: SessionMessageRow): number {
    return -this.compareRowsAsc(a, b);
  }

  private compareCompactionsAsc(a: CompactionRow, b: CompactionRow): number {
    const aTime =
      a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const bTime =
      b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return aTime - bTime || a.id.localeCompare(b.id);
  }
}
