import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$notebookID/_sidebar/_panel/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$notebookID/$chatID",
      params: {
        notebookID: params.notebookID,
        chatID: crypto.randomUUID(),
      },
      replace: true,
    });
  },
});
