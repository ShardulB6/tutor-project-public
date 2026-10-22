import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Progress } from "#/components/ui/progress";
import { Spinner } from "#/components/ui/spinner";
import type { Flashcard, FlashcardsId } from "#/db/studio.schema";
import type { NotebookId } from "#/db/schema";
import { getFlashcardSet } from "#/lib/functions/studio.functions";
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  RotateCcwIcon,
  ShuffleIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LoadedFlashcardSet } from "./types";

type FlashcardViewerDialogProps = {
  id: FlashcardsId;
  notebookID: NotebookId;
  sessionID: string;
  title: string;
};

export function FlashcardViewerDialog({
  id,
  notebookID,
  sessionID,
  title,
}: FlashcardViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<LoadedFlashcardSet>();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveToCard = useCallback(
    (direction: -1 | 1) => {
      setCurrentIndex((currentCardIndex) => {
        if (cards.length === 0) return 0;
        return (currentCardIndex + direction + cards.length) % cards.length;
      });
      setIsRevealed(false);
    },
    [cards.length],
  );

  useEffect(() => {
    if (!open || cards.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveToCard(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveToCard(1);
      } else if (event.code === "Space") {
        event.preventDefault();
        setIsRevealed((currentValue) => !currentValue);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, moveToCard, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;

    setFlashcardSet(undefined);
    setCards([]);
    setCurrentIndex(0);
    setIsRevealed(false);
    setError(null);
    void getFlashcardSet({
      data: { id, notebookId: notebookID, sessionId: sessionID },
    })
      .then((nextFlashcardSet) => {
        setFlashcardSet(nextFlashcardSet);
        setCards(nextFlashcardSet.cards);
      })
      .catch(() => setError("Could not load these flashcards. Try again."));
  };

  const handleShuffle = () => {
    setCards((currentCards) => {
      const shuffledCards = [...currentCards];
      for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
        const targetIndex = Math.floor(Math.random() * (index + 1));
        [shuffledCards[index], shuffledCards[targetIndex]] = [
          shuffledCards[targetIndex],
          shuffledCards[index],
        ];
      }
      return shuffledCards;
    });
    setCurrentIndex(0);
    setIsRevealed(false);
  };

  const handleReset = () => {
    if (!flashcardSet) return;
    setCards(flashcardSet.cards);
    setCurrentIndex(0);
    setIsRevealed(false);
  };

  const currentCard = cards[currentIndex];
  const progress = cards.length === 0 ? 0 : ((currentIndex + 1) / cards.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Open flashcards ${title}`}
          className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-2 font-normal"
          title={title}
          type="button"
          variant="ghost"
        >
          <LayersIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto border-0 p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <div className="space-y-7 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="min-w-0 gap-3 text-left">
              <DialogTitle className="flex items-center gap-3 text-2xl sm:text-3xl">
                <BookOpenIcon className="size-7 shrink-0" />
                <span className="truncate">{flashcardSet?.title ?? title}</span>
              </DialogTitle>
              <DialogDescription className="text-base sm:text-lg">
                Click the card to flip. Use arrow keys to navigate.
              </DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label="Shuffle flashcards"
                disabled={!flashcardSet || cards.length < 2}
                onClick={handleShuffle}
                size="icon-lg"
                type="button"
                variant="secondary"
              >
                <ShuffleIcon className="size-5" />
              </Button>
              <Button
                aria-label="Reset flashcards"
                disabled={!flashcardSet}
                onClick={handleReset}
                size="icon-lg"
                type="button"
                variant="ghost"
              >
                <RotateCcwIcon className="size-5" />
              </Button>
              <DialogClose asChild>
                <Button aria-label="Close flashcards" size="icon-lg" type="button" variant="ghost">
                  <XIcon className="size-5" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {error ? (
            <p className="py-12 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : flashcardSet && currentCard ? (
            <div className="space-y-7">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                    {currentIndex + 1} / {cards.length}
                  </span>
                </div>
                <Progress aria-label="Flashcard progress" value={progress} />
              </div>

              <button
                aria-label={isRevealed ? "Show flashcard question" : "Reveal flashcard answer"}
                className="block w-full rounded-xl text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                type="button"
                onClick={() => setIsRevealed((currentValue) => !currentValue)}
              >
                <Card className="min-h-80 justify-center border-0 bg-muted/30 py-10 shadow-none transition-colors hover:bg-muted/50">
                  <CardContent className="space-y-7 px-6 sm:px-10">
                    <span className="inline-flex rounded-full bg-background px-4 py-1 text-sm font-medium">
                      {isRevealed ? "Answer" : "Question"}
                    </span>
                    <p className="wrap-break-word text-2xl font-medium sm:text-3xl">
                      {isRevealed ? currentCard.back : currentCard.front}
                    </p>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      {isRevealed ? "Click to show question" : "Click to reveal answer"}
                    </p>
                  </CardContent>
                </Card>
              </button>

              <div className="flex items-center justify-between">
                <Button
                  aria-label="Previous flashcard"
                  onClick={() => moveToCard(-1)}
                  size="icon-lg"
                  type="button"
                  variant="secondary"
                >
                  <ChevronLeftIcon className="size-5" />
                </Button>
                <Button
                  aria-label="Next flashcard"
                  onClick={() => moveToCard(1)}
                  size="icon-lg"
                  type="button"
                  variant="secondary"
                >
                  <ChevronRightIcon className="size-5" />
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground sm:text-base">
                Press Space to flip &middot; Arrow keys to navigate
              </p>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
