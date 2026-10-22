import { ModelSelectorLogo } from "#/components/ai-elements/model-selector";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import type { NotebookId } from "#/db/schema";
import { AI_PROVIDER_LABELS, type AiProvider } from "#/lib/ai-provider";
import type { FileId } from "#/lib/functions/file.functions";
import { createStudioObject } from "#/lib/functions/studio.functions";
import {
  DEFAULT_TUTOR_REASONING_LEVEL,
  STUDIO_GENERATION_MODEL,
  isTutorModelAvailable,
  isTutorModelId,
  isTutorReasoningLevel,
  supportsTutorReasoning,
  TUTOR_MODELS,
  TUTOR_REASONING_LEVELS,
  type TutorModelId,
  type TutorReasoningLevel,
} from "#/lib/models";
import { LayersIcon, ListChecksIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { NotebookFile, RefreshStudioObjects, StudioType } from "./types";

type StudioGenerationDialogProps = {
  apiKey: string | null;
  provider: AiProvider;
  files: NotebookFile[];
  hasThread: boolean;
  isApiKeyLoaded: boolean;
  notebookID: NotebookId;
  onCreated: RefreshStudioObjects;
  sessionID?: string;
  type: StudioType;
};

export function StudioGenerationDialog({
  apiKey,
  provider,
  files,
  hasThread,
  isApiKeyLoaded,
  notebookID,
  onCreated,
  sessionID,
  type,
}: StudioGenerationDialogProps) {
  const isQuiz = type === "quiz";
  const label = isQuiz ? "Quiz" : "Flashcards";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`New ${label}`);
  const [selectedFileIds, setSelectedFileIds] = useState<FileId[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<TutorModelId>(STUDIO_GENERATION_MODEL);
  const [reasoningLevel, setReasoningLevel] = useState<TutorReasoningLevel>(
    DEFAULT_TUTOR_REASONING_LEVEL,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = TUTOR_MODELS.filter((model) => isTutorModelAvailable(provider, model.id));
  const modelProviders = [...new Set(availableModels.map((model) => model.provider))];
  const modelId = isTutorModelAvailable(provider, selectedModelId)
    ? selectedModelId
    : STUDIO_GENERATION_MODEL;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isGenerating) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setTitle(`New ${label}`);
      setSelectedFileIds([]);
      setSelectedModelId(STUDIO_GENERATION_MODEL);
      setReasoningLevel(DEFAULT_TUTOR_REASONING_LEVEL);
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiKey) {
      setError(
        `Add your ${AI_PROVIDER_LABELS[provider]} key in Settings before generating study materials.`,
      );
      return;
    }
    if (!sessionID) {
      setError("Open a chat before generating study materials.");
      return;
    }
    if (!hasThread) {
      setError("Send a chat message before generating study materials.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      await createStudioObject({
        data: {
          apiKey,
          provider,
          fileIds: selectedFileIds,
          model: modelId,
          notebookId: notebookID,
          ...(supportsTutorReasoning(modelId) ? { reasoningLevel } : {}),
          prompt: isQuiz
            ? "Create a comprehensive multiple-choice quiz that tests the most important concepts."
            : "Create concise flashcards covering the most important concepts.",
          sessionId: sessionID,
          title,
          type,
        },
      });
      await onCreated();
      setOpen(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : `Could not create ${label.toLowerCase()}. Try again.`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          disabled={!hasThread}
          title={hasThread ? undefined : "Send a chat message first"}
          type="button"
          variant="outline"
        >
          {isQuiz ? <ListChecksIcon /> : <LayersIcon />}
          {isQuiz ? "Quiz" : "Flashcard"}
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <form className="min-w-0 space-y-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create {label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              The current chat is always included. Choose any notebook files you also want to use.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${type}-title`}>Name</Label>
            <Input
              disabled={isGenerating}
              id={`${type}-title`}
              maxLength={100}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${type}-model`}>Model</Label>
              <Select
                disabled={isGenerating}
                onValueChange={(value) => {
                  if (isTutorModelId(value)) {
                    setSelectedModelId(value);
                  }
                }}
                value={modelId}
              >
                <SelectTrigger className="w-full" id={`${type}-model`}>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelProviders.map((modelProvider) => (
                    <SelectGroup key={modelProvider}>
                      <SelectLabel>{modelProvider}</SelectLabel>
                      {availableModels
                        .filter((model) => model.provider === modelProvider)
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <ModelSelectorLogo provider={model.id.split("/")[0]} />
                            {model.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supportsTutorReasoning(modelId) ? (
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${type}-reasoning-level`}>Reasoning level</Label>
                <Select
                  disabled={isGenerating}
                  onValueChange={(value) => {
                    if (isTutorReasoningLevel(value)) {
                      setReasoningLevel(value);
                    }
                  }}
                  value={reasoningLevel}
                >
                  <SelectTrigger className="w-full" id={`${type}-reasoning-level`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTOR_REASONING_LEVELS.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <fieldset className="min-w-0 space-y-3" disabled={isGenerating}>
            <legend className="text-sm font-medium">Notebook files (optional)</legend>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notebook files have been uploaded yet.
              </p>
            ) : (
              <div className="max-h-52 min-w-0 max-w-full space-y-1 overflow-x-hidden overflow-y-auto rounded-md border p-2">
                {files.map((file) => {
                  const checkboxId = `${type}-file-${file.id}`;
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                    <div
                      className="flex min-w-0 max-w-full items-center gap-3 rounded-md p-2 hover:bg-muted"
                      key={file.id}
                    >
                      <Checkbox
                        checked={isSelected}
                        id={checkboxId}
                        onCheckedChange={(checked) => {
                          setSelectedFileIds((currentFileIds) =>
                            checked
                              ? [...currentFileIds, file.id]
                              : currentFileIds.filter((fileId) => fileId !== file.id),
                          );
                        }}
                      />
                      <Label
                        className="min-w-0 flex-1 cursor-pointer overflow-hidden"
                        htmlFor={checkboxId}
                      >
                        <span className="block min-w-0 truncate">{file.title}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {isApiKeyLoaded && !apiKey && !error ? (
            <p className="text-sm text-muted-foreground">
              Add your {AI_PROVIDER_LABELS[provider]} key in Settings to generate study materials.
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isGenerating} type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={isGenerating || !hasThread || !isApiKeyLoaded || !apiKey}
              type="submit"
            >
              {isGenerating ? "Generating..." : `Create ${label.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
