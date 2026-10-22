import { Separator } from "#/components/ui/separator";
import type { NotebookId } from "#/db/schema";
import { useAiCredentials } from "#/lib/ai-credentials";
import { getStudioState } from "#/lib/functions/studio.functions";
import { useCallback, useEffect, useState } from "react";
import { FlashcardViewerDialog } from "./FlashcardViewerDialog";
import { QuizViewerDialog } from "./QuizViewerDialog";
import { StudioDeleteDialog } from "./StudioDeleteDialog";
import { StudioGenerationDialog } from "./StudioGenerationDialog";
import type { NotebookFile } from "./types";

type NotebookStudioProps = {
  files: NotebookFile[];
  notebookID: NotebookId;
  sessionID?: string;
};

export function NotebookStudio({ files, notebookID, sessionID }: NotebookStudioProps) {
  const { apiKey, provider, isLoaded: isApiKeyLoaded } = useAiCredentials();
  const [studioObjects, setStudioObjects] = useState<
    Awaited<ReturnType<typeof getStudioState>>["objects"]
  >([]);
  const [hasThread, setHasThread] = useState(false);

  const refreshStudioObjects = useCallback(async () => {
    if (!sessionID) {
      setStudioObjects([]);
      setHasThread(false);
      return false;
    }

    const studioState = await getStudioState({
      data: { notebookId: notebookID, sessionId: sessionID },
    });
    setStudioObjects(studioState.objects);
    setHasThread(studioState.hasThread);
    return studioState.hasThread;
  }, [notebookID, sessionID]);

  useEffect(() => {
    let isCancelled = false;
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

    const refreshUntilThreadExists = async () => {
      try {
        const threadExists = await refreshStudioObjects();
        if (!threadExists && !isCancelled) {
          refreshTimeout = setTimeout(() => void refreshUntilThreadExists(), 1_500);
        }
      } catch {
        setStudioObjects([]);
        setHasThread(false);
      }
    };

    void refreshUntilThreadExists();

    return () => {
      isCancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [refreshStudioObjects]);

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3 px-4 py-4">
      <span className="shrink-0 font-semibold">Studio</span>
      <div className="flex w-full shrink-0 flex-col gap-2">
        <StudioGenerationDialog
          apiKey={apiKey}
          provider={provider}
          files={files}
          hasThread={hasThread}
          isApiKeyLoaded={isApiKeyLoaded}
          notebookID={notebookID}
          sessionID={sessionID}
          type="quiz"
          onCreated={refreshStudioObjects}
        />
        <StudioGenerationDialog
          apiKey={apiKey}
          provider={provider}
          files={files}
          hasThread={hasThread}
          isApiKeyLoaded={isApiKeyLoaded}
          notebookID={notebookID}
          sessionID={sessionID}
          type="flashcards"
          onCreated={refreshStudioObjects}
        />
        {!hasThread ? (
          <p className="text-center text-xs text-muted-foreground">
            Send a chat message before creating study materials.
          </p>
        ) : null}
      </div>
      <Separator />
      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        {studioObjects.length === 0 || !sessionID ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Generated study materials will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {studioObjects.map((studioObject) => (
              <li
                className="rounded-md border text-sm"
                key={`${studioObject.type}-${studioObject.id}`}
              >
                <div className="flex items-center gap-1 p-1">
                  {studioObject.type === "quiz" ? (
                    <QuizViewerDialog
                      id={studioObject.id}
                      notebookID={notebookID}
                      sessionID={sessionID}
                      title={studioObject.title}
                    />
                  ) : (
                    <FlashcardViewerDialog
                      id={studioObject.id}
                      notebookID={notebookID}
                      sessionID={sessionID}
                      title={studioObject.title}
                    />
                  )}
                  <StudioDeleteDialog
                    notebookID={notebookID}
                    object={studioObject}
                    sessionID={sessionID}
                    onDeleted={refreshStudioObjects}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
