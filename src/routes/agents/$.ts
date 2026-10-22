import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { routeAgentRequest } from "agents";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { type NotebookId, NotebooksTable } from "#/db/schema";
import { auth } from "#/lib/auth/auth";

async function handleAgentRequest(request: Request) {
  return (
    (await routeAgentRequest(request, env)) ?? new Response("Agent not found", { status: 404 })
  );
}

const ensureNotebookOwner = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const encodedAgentName = new URL(request.url).pathname.split("/")[3];
    let notebookId: NotebookId;
    try {
      notebookId = decodeURIComponent(encodedAgentName ?? "").split(":", 1)[0] as NotebookId;
    } catch {
      return new Response("Invalid agent name", { status: 400 });
    }

    if (!notebookId) {
      return new Response("Invalid agent name", { status: 400 });
    }

    const notebook = await db.query.NotebooksTable.findFirst({
      columns: { id: true },
      where: and(
        eq(NotebooksTable.id, notebookId),
        eq(NotebooksTable.userID, session.user.id),
        eq(NotebooksTable.isDeleting, false),
      ),
    });
    if (!notebook) {
      return new Response("Forbidden", { status: 403 });
    }

    return next();
  },
);

export const Route = createFileRoute("/agents/$")({
  server: {
    middleware: [ensureNotebookOwner],
    handlers: {
      GET: ({ request }) => handleAgentRequest(request),
      POST: ({ request }) => handleAgentRequest(request),
    },
  },
});
