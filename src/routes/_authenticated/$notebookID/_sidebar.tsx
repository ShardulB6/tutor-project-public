import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { CheckIcon, PencilIcon, PlusIcon, SettingsIcon, Trash2Icon, XIcon } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NotebookId } from "#/db/schema";
import { getServerNotebook } from "#/lib/functions/notebooks.functions";
import {
  deleteServerThread,
  getServerThreads,
  renameServerThread,
} from "#/lib/functions/threads.function";
import { cn } from "#/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useEffect, useState } from "react";
import z from "zod";

export const Route = createFileRoute("/_authenticated/$notebookID/_sidebar")({
  loader: async ({ params }) => {
    const notebook = await getServerNotebook({ data: { id: params.notebookID } });
    const threads = await getServerThreads({ data: { notebookId: params.notebookID } });
    return { notebook, threads };
  },
  params: z.object({ notebookID: z.string().brand<"NotebookId">() }),

  component: RouteComponent,
});

function RouteComponent() {
  const { notebook, threads } = Route.useLoaderData();
  const { notebookID } = Route.useParams();

  return (
    <div>
      <SidebarProvider>
        <AppSidebar notebook={notebook} notebookID={notebookID} threads={threads} />
        <SidebarInset className="h-screen overflow-hidden">
          <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

type ChatSidebarProps = {
  notebook: Awaited<ReturnType<typeof getServerNotebook>>;
  notebookID: NotebookId;
  threads: Awaited<ReturnType<typeof getServerThreads>>;
};

export function AppSidebar({ notebook, notebookID, threads }: ChatSidebarProps) {
  const router = useRouter();
  const deleteThread = useServerFn(deleteServerThread);
  const renameThread = useServerFn(renameServerThread);
  const [visibleThreads, setVisibleThreads] = useState(threads);
  const [editingThreadID, setEditingThreadID] = useState<string | null>(null);
  const [draftThreadName, setDraftThreadName] = useState("");
  const [renamingThreadID, setRenamingThreadID] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    setVisibleThreads(threads);
  }, [threads]);

  async function handleRename(event: FormEvent<HTMLFormElement>, threadID: string) {
    event.preventDefault();

    const name = draftThreadName.replace(/\s+/g, " ").trim();
    if (!name) {
      setRenameError("Chat name cannot be empty.");
      return;
    }

    setRenameError(null);
    setRenamingThreadID(threadID);

    try {
      const renamedThread = await renameThread({
        data: {
          name,
          notebookId: notebookID,
          sessionId: threadID,
        },
      });

      setVisibleThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.sessionID === threadID ? { ...thread, name: renamedThread.name } : thread,
        ),
      );
      setEditingThreadID(null);
      setDraftThreadName("");
      await router.invalidate();
    } catch {
      setRenameError("Could not rename this chat. Try again.");
    } finally {
      setRenamingThreadID(null);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 text-center">
          <h3 className="truncate font-semibold" title={notebook?.title}>
            {notebook?.title}
          </h3>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link params={{ notebookID }} to="/$notebookID">
                <PlusIcon />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Threads</SidebarGroupLabel>
          <div className="space-y-1">
            {visibleThreads.map((thread) => (
              <div className="space-y-1" key={thread.sessionID}>
                <div className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground has-[[data-status=active]]:bg-sidebar-accent has-[[data-status=active]]:text-sidebar-accent-foreground">
                  {editingThreadID === thread.sessionID ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1"
                      onSubmit={(event) => handleRename(event, thread.sessionID)}
                    >
                      <Input
                        aria-invalid={Boolean(renameError)}
                        aria-label={`Rename chat ${thread.name}`}
                        autoFocus
                        className="h-7 min-w-0 flex-1 px-2 text-sm"
                        disabled={renamingThreadID === thread.sessionID}
                        maxLength={60}
                        value={draftThreadName}
                        onChange={(event) => setDraftThreadName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setEditingThreadID(null);
                            setDraftThreadName("");
                            setRenameError(null);
                          }
                        }}
                      />
                      <Button
                        aria-label="Save chat name"
                        className={cn("hover:bg-gray-200 dark:hover:bg-gray-600")}
                        disabled={renamingThreadID === thread.sessionID}
                        size="icon-xs"
                        title="Save chat name"
                        type="submit"
                        variant="ghost"
                      >
                        <CheckIcon />
                      </Button>
                      <Button
                        aria-label="Cancel renaming"
                        className={cn("hover:bg-gray-200 dark:hover:bg-gray-600")}
                        disabled={renamingThreadID === thread.sessionID}
                        size="icon-xs"
                        title="Cancel renaming"
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingThreadID(null);
                          setDraftThreadName("");
                          setRenameError(null);
                        }}
                      >
                        <XIcon />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <Link
                        className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm"
                        params={{ notebookID, chatID: thread.sessionID }}
                        title={thread.name}
                        to="/$notebookID/$chatID"
                      >
                        {thread.name}
                      </Link>
                      <Button
                        aria-label={`Rename chat ${thread.name}`}
                        className={cn("shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600")}
                        disabled={renamingThreadID !== null}
                        size="icon-xs"
                        title="Rename chat"
                        variant="ghost"
                        onClick={() => {
                          setEditingThreadID(thread.sessionID);
                          setDraftThreadName(thread.name);
                          setRenameError(null);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={`Delete thread ${thread.name}`}
                        className={cn("shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600")}
                        disabled={renamingThreadID !== null}
                        size="icon-xs"
                        title="Delete thread"
                        variant="ghost"
                        onClick={async () => {
                          const currentPath = window.location.pathname.replace(/\/$/, "");
                          const threadPath = `/${notebookID}/${thread.sessionID}`;
                          const isCurrentThread = currentPath === threadPath;

                          await deleteThread({
                            data: {
                              notebookId: notebookID,
                              sessionId: thread.sessionID,
                            },
                          });
                          setVisibleThreads((currentThreads) =>
                            currentThreads.filter(
                              (currentThread) => currentThread.sessionID !== thread.sessionID,
                            ),
                          );

                          if (isCurrentThread) {
                            await router.navigate({
                              params: {
                                notebookID,
                                chatID: crypto.randomUUID(),
                              },
                              replace: true,
                              to: "/$notebookID/$chatID",
                            });
                          }

                          await router.invalidate();
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </>
                  )}
                </div>
                {editingThreadID === thread.sessionID && renameError ? (
                  <p className="px-2 text-xs text-destructive" role="alert">
                    {renameError}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <SettingsIcon />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
