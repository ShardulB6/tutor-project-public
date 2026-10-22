import { NotebookSources } from "#/components/notebook-panel/NotebookSources";
import { NotebookStudio } from "#/components/notebook-panel/NotebookStudio";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/ui/resizable";
import { getFiles } from "#/lib/functions/file.functions";
import { createFileRoute, Outlet, useParams, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$notebookID/_sidebar/_panel")({
  loader: async ({ params }) => {
    const files = await getFiles({ data: { notebookId: params.notebookID } });

    return { files };
  },

  component: RouteComponent,
});

function RouteComponent() {
  const { files } = Route.useLoaderData();
  const { notebookID } = Route.useParams();
  const { chatID } = useParams({ strict: false });
  const router = useRouter();

  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="20%" minSize="10%">
        <NotebookSources
          files={files}
          notebookID={notebookID}
          onFilesChanged={() => router.invalidate()}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel className="h-screen" defaultSize="60%" minSize="40%">
        <Outlet />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="20%" minSize="10%">
        <NotebookStudio files={files} notebookID={notebookID} sessionID={chatID} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
