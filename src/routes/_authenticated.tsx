import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthSession } from "#/lib/auth/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getAuthSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { user: session.user };
  },
});
