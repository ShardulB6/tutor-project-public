import { Button } from "#/components/ui/button";
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
import { Spinner } from "#/components/ui/spinner";
import type { NotebookId } from "#/db/schema";
import { deleteStudioObject } from "#/lib/functions/studio.functions";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { RefreshStudioObjects, StudioObject } from "./types";

type StudioDeleteDialogProps = {
  notebookID: NotebookId;
  object: StudioObject;
  onDeleted: RefreshStudioObjects;
  sessionID: string;
};

export function StudioDeleteDialog({
  notebookID,
  object,
  onDeleted,
  sessionID,
}: StudioDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = object.type === "quiz" ? "quiz" : "flashcard set";

  const handleOpenChange = (nextOpen: boolean) => {
    if (isDeleting) return;
    setOpen(nextOpen);
    if (nextOpen) setError(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      if (object.type === "quiz") {
        await deleteStudioObject({
          data: {
            id: object.id,
            notebookId: notebookID,
            sessionId: sessionID,
            type: "quiz",
          },
        });
      } else {
        await deleteStudioObject({
          data: {
            id: object.id,
            notebookId: notebookID,
            sessionId: sessionID,
            type: "flashcards",
          },
        });
      }

      await onDeleted();
      setOpen(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : `Could not delete this ${label}. Try again.`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Delete ${object.title}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          size="icon-sm"
          title={`Delete ${label}`}
          type="button"
          variant="ghost"
        >
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>
            “{object.title}” will be permanently removed from this thread.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isDeleting} type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={isDeleting} type="button" variant="destructive" onClick={handleDelete}>
            {isDeleting ? <Spinner /> : <Trash2Icon />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
