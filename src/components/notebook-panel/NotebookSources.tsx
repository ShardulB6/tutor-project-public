import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { NotebookId } from "#/db/schema";
import {
  deleteFile,
  type FileId,
  saveFileSchema,
  updateFileTopics,
} from "#/lib/functions/file.functions";
import { MAX_FILE_TOPICS, MAX_FILE_TOPIC_LENGTH, parseFileTopicsInput } from "#/lib/file-topics";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import type { NotebookFile } from "./types";

type NotebookSourcesProps = {
  files: NotebookFile[];
  notebookID: NotebookId;
  onFilesChanged: () => Promise<unknown>;
};

export function NotebookSources({ files, notebookID, onFilesChanged }: NotebookSourcesProps) {
  const [deletingFileIds, setDeletingFileIds] = useState<FileId[]>([]);
  const [savingTopicFileIds, setSavingTopicFileIds] = useState<FileId[]>([]);
  const [topicDrafts, setTopicDrafts] = useState<Record<string, string>>({});
  const [topicErrors, setTopicErrors] = useState<Record<string, string>>({});

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("notebookId", notebookID);

    try {
      await saveFileSchema({ data: formData });
      await onFilesChanged();
    } finally {
      input.value = "";
    }
  };

  const handleDeleteFile = async (fileId: FileId) => {
    if (savingTopicFileIds.includes(fileId)) return;

    setDeletingFileIds((currentFileIds) => [...currentFileIds, fileId]);

    try {
      await deleteFile({ data: { notebookId: notebookID, fileId } });
      setTopicDrafts((currentDrafts) => removeRecordKey(currentDrafts, fileId));
      setTopicErrors((currentErrors) => removeRecordKey(currentErrors, fileId));
      await onFilesChanged();
    } finally {
      setDeletingFileIds((currentFileIds) =>
        currentFileIds.filter((currentFileId) => currentFileId !== fileId),
      );
    }
  };

  const handleSaveTopics = async (
    event: FormEvent<HTMLFormElement>,
    fileId: FileId,
    savedTopics: string[],
  ) => {
    event.preventDefault();

    if (deletingFileIds.includes(fileId) || savingTopicFileIds.includes(fileId)) return;

    let topics: string[];
    try {
      topics = parseFileTopicsInput(topicDrafts[fileId] ?? savedTopics.join(", "));
    } catch {
      setTopicErrors((currentErrors) => ({
        ...currentErrors,
        [fileId]: `Use up to ${MAX_FILE_TOPICS} topics, each ${MAX_FILE_TOPIC_LENGTH} characters or fewer.`,
      }));
      return;
    }

    setTopicErrors((currentErrors) => ({ ...currentErrors, [fileId]: "" }));
    setSavingTopicFileIds((currentFileIds) => [...currentFileIds, fileId]);

    try {
      const updatedFile = await updateFileTopics({
        data: { notebookId: notebookID, fileId, topics },
      });
      setTopicDrafts((currentDrafts) => ({
        ...currentDrafts,
        [fileId]: updatedFile.topics.join(", "),
      }));
      await onFilesChanged();
      setTopicDrafts((currentDrafts) => removeRecordKey(currentDrafts, fileId));
    } catch {
      setTopicErrors((currentErrors) => ({
        ...currentErrors,
        [fileId]: "Could not save topics. Try again.",
      }));
    } finally {
      setSavingTopicFileIds((currentFileIds) =>
        currentFileIds.filter((currentFileId) => currentFileId !== fileId),
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-4">
      <div className="flex shrink-0 flex-col items-center gap-3 py-4">
        <span className="font-semibold">Sources</span>
        <input
          type="file"
          accept=".pdf"
          className="block w-full max-w-40 text-sm"
          onChange={handleFileUpload}
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {files.map((file) => (
          <li className="border-border border-b py-1 last:border-b-0" key={file.id}>
            <div className="flex items-start gap-2 rounded-md p-2 text-sm">
              <span className="wrap-break-word min-w-0 flex-1">{file.title}</span>
              <Button
                aria-label={`Delete ${file.title}`}
                disabled={deletingFileIds.includes(file.id) || savingTopicFileIds.includes(file.id)}
                onClick={() => handleDeleteFile(file.id)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </div>
            <form
              className="space-y-1 px-2 pb-2"
              onSubmit={(event) => handleSaveTopics(event, file.id, file.topics)}
            >
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor={`file-topics-${file.id}`}
              >
                Topics
              </label>
              <div className="flex items-center gap-1">
                <Input
                  aria-describedby={`file-topics-description-${file.id}`}
                  aria-invalid={Boolean(topicErrors[file.id])}
                  disabled={
                    deletingFileIds.includes(file.id) || savingTopicFileIds.includes(file.id)
                  }
                  id={`file-topics-${file.id}`}
                  maxLength={MAX_FILE_TOPICS * (MAX_FILE_TOPIC_LENGTH + 2)}
                  value={topicDrafts[file.id] ?? file.topics.join(", ")}
                  onChange={(event) => {
                    setTopicDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [file.id]: event.target.value,
                    }));
                    setTopicErrors((currentErrors) => ({
                      ...currentErrors,
                      [file.id]: "",
                    }));
                  }}
                />
                <Button
                  aria-label={`Save topics for ${file.title}`}
                  disabled={
                    deletingFileIds.includes(file.id) || savingTopicFileIds.includes(file.id)
                  }
                  size="icon-sm"
                  title="Save topics"
                  type="submit"
                  variant="ghost"
                >
                  <CheckIcon />
                </Button>
              </div>
              {topicErrors[file.id] ? (
                <p
                  className="text-xs text-destructive"
                  id={`file-topics-description-${file.id}`}
                  role="alert"
                >
                  {topicErrors[file.id]}
                </p>
              ) : (
                <p
                  className="text-xs text-muted-foreground"
                  id={`file-topics-description-${file.id}`}
                >
                  Separate topics with commas.
                </p>
              )}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function removeRecordKey(record: Record<string, string>, key: string): Record<string, string> {
  const nextRecord = { ...record };
  delete nextRecord[key];
  return nextRecord;
}
