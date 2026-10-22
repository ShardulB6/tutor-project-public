import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  createServerNotebook,
  deleteServerNotebook,
  getServerNotebooks,
} from "#/lib/functions/notebooks.functions";
import { useServerFn } from "@tanstack/react-start";
import { PopUpCreateNotebook } from "#/components/PopUpCreateNotebook";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/")({
  loader: async () => {
    const notebooks = await getServerNotebooks();

    return { notebooks };
  },

  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4 gap-4 mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Notebooks</h1>
        <Button asChild variant="outline">
          <Link to="/settings">
            <SettingsIcon />
            Settings
          </Link>
        </Button>
      </div>
      <div className="mt-4">
        <CreateNotebookComponent />
      </div>
      <NotebooksComponent />
    </div>
  );
}

const NotebooksComponent = () => {
  const { notebooks } = Route.useLoaderData();
  return (
    <div className="flex flex-row gap-4 flex-wrap mt-6 ">
      {notebooks.map((notebook) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
};

const CreateNotebookComponent = () => {
  const createNotebook = useServerFn(createServerNotebook);
  const router = useRouter();

  return (
    <PopUpCreateNotebook
      onCreate={async ({ title }) => {
        await createNotebook({
          data: {
            title,
          },
        });
        await router.load();
      }}
    />
  );
};

export function NotebookCard({
  notebook,
}: {
  notebook: Awaited<ReturnType<typeof getServerNotebooks>>[number];
}) {
  const router = useRouter();
  const deleteNotebook = useServerFn(deleteServerNotebook);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  return (
    <Card className="relative max-w-sm border-0 pt-0 shadow-none ">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={"https://avatar.vercel.sh/shadcn1"}
        alt={notebook.title}
        className="relative z-20 aspect-video w-full rounded-t-lg object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader>
        <CardAction></CardAction>
        <CardTitle className="truncate leading-normal">{notebook.title}</CardTitle>
        <CardDescription>Created on {notebook.createdAt?.toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={isDeleting || notebook.isDeleting}
          onClick={() =>
            router.navigate({
              to: "/$notebookID",
              params: { notebookID: notebook.id },
            })
          }
        >
          View Notebook
        </Button>
        <Button
          className="w-full"
          variant="destructive"
          disabled={isDeleting}
          onClick={async () => {
            setIsDeleting(true);
            setDeleteError(null);
            try {
              await deleteNotebook({ data: { id: notebook.id } });
            } catch {
              setDeleteError("Could not finish deleting this notebook. Please retry.");
            } finally {
              setIsDeleting(false);
              await router.invalidate();
            }
          }}
        >
          {isDeleting ? "Deleting…" : notebook.isDeleting ? "Retry deletion" : "Delete Notebook"}
        </Button>
        {deleteError ? (
          <p role="alert" className="text-sm text-destructive">
            {deleteError}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
