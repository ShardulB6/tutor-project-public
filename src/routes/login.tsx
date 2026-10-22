import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "#/components/auth-layout";
import { Button } from "#/components/ui/button";
import { FieldError } from "#/components/ui/field";
import { authClient } from "#/lib/auth/auth-client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in | Tutor AI" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGitHubSignIn() {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });

      if (result.error) {
        setError(result.error.message || "Unable to connect to GitHub. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setError("Unable to connect to GitHub. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div aria-busy={isSubmitting} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold">Welcome to Tutor AI</h1>
          <p className="text-sm text-muted-foreground">Continue with GitHub to start learning.</p>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          disabled={isSubmitting}
          onClick={handleGitHubSignIn}
          type="button"
          variant="outline"
        >
          <Github />
          {isSubmitting ? "Connecting…" : "Continue with GitHub"}
        </Button>
      </div>
    </AuthLayout>
  );
}
