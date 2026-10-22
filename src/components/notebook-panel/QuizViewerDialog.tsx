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
import { Spinner } from "#/components/ui/spinner";
import type { QuizId } from "#/db/studio.schema";
import type { NotebookId } from "#/db/schema";
import { getQuiz } from "#/lib/functions/studio.functions";
import { cn } from "#/lib/utils";
import { CheckIcon, ListChecksIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { LoadedQuiz } from "./types";

type QuizViewerDialogProps = {
  id: QuizId;
  notebookID: NotebookId;
  sessionID: string;
  title: string;
};

function normalizeQuizChoice(choice: string) {
  return choice.normalize("NFKC").trim().toLocaleLowerCase();
}

export function QuizViewerDialog({ id, notebookID, sessionID, title }: QuizViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState<LoadedQuiz>();
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [isGraded, setIsGraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;

    setQuiz(undefined);
    setResponses({});
    setIsGraded(false);
    setError(null);
    void getQuiz({
      data: { id, notebookId: notebookID, sessionId: sessionID },
    })
      .then(setQuiz)
      .catch((quizError) =>
        setError(
          quizError instanceof Error ? quizError.message : "Could not load this quiz. Try again.",
        ),
      );
  };

  const handleReset = () => {
    setResponses({});
    setIsGraded(false);
  };

  const questionCount = quiz?.questions.length ?? 0;
  const answeredCount = Object.values(responses).filter(Boolean).length;
  const score =
    quiz?.questions.reduce(
      (currentScore, question, questionIndex) =>
        currentScore +
        (normalizeQuizChoice(responses[questionIndex] ?? "") ===
        normalizeQuizChoice(question.answer)
          ? 1
          : 0),
      0,
    ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Open quiz ${title}`}
          className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-2 font-normal"
          title={title}
          type="button"
          variant="ghost"
        >
          <ListChecksIcon className="size-4 shrink-0 text-muted-foreground" />
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
                <ListChecksIcon className="size-7 shrink-0" />
                <span className="truncate">{quiz?.title ?? title}</span>
              </DialogTitle>
              <DialogDescription className="text-base sm:text-lg">
                Answer every question, then submit the quiz to see your results.
              </DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label="Reset quiz"
                disabled={!quiz}
                onClick={handleReset}
                size="icon-lg"
                type="button"
                variant="ghost"
              >
                <RotateCcwIcon className="size-5" />
              </Button>
              <DialogClose asChild>
                <Button aria-label="Close quiz" size="icon-lg" type="button" variant="ghost">
                  <XIcon className="size-5" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {error ? (
            <p className="py-12 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : quiz ? (
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                setIsGraded(true);
              }}
            >
              {isGraded ? (
                <Card className="border-0 bg-muted/40 py-6 shadow-none">
                  <CardContent className="flex flex-col gap-3 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Quiz result</p>
                    <p className="text-4xl font-semibold">
                      {score} / {questionCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((score / questionCount) * 100)}% correct
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-5">
                {quiz.questions.map((question, questionIndex) => {
                  const response = responses[questionIndex];
                  const isQuestionAnswered = Boolean(response);
                  const isQuestionCorrect =
                    normalizeQuizChoice(response ?? "") === normalizeQuizChoice(question.answer);

                  return (
                    <Card
                      className="gap-5 border-0 bg-muted/30 py-7 shadow-none"
                      key={questionIndex}
                    >
                      <CardContent className="space-y-6 px-6 sm:px-8">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex rounded-full bg-background px-3 py-1 text-xs font-medium">
                            Question {questionIndex + 1}
                          </span>
                          {isGraded ? (
                            <span
                              className={cn(
                                "text-sm font-medium",
                                !isQuestionAnswered && "text-muted-foreground",
                                isQuestionAnswered &&
                                  (isQuestionCorrect ? "text-emerald-600" : "text-destructive"),
                              )}
                            >
                              {!isQuestionAnswered
                                ? "Unanswered"
                                : isQuestionCorrect
                                  ? "Correct"
                                  : "Incorrect"}
                            </span>
                          ) : null}
                        </div>
                        <p className="wrap-break-word text-xl font-medium sm:text-2xl">
                          {question.question}
                        </p>

                        <div className="grid gap-3">
                          {question.choices.map((choice, choiceIndex) => {
                            const isSelected = response === choice;
                            const isCorrectChoice =
                              normalizeQuizChoice(choice) === normalizeQuizChoice(question.answer);
                            const isIncorrectSelection = isGraded && isSelected && !isCorrectChoice;

                            return (
                              <button
                                aria-pressed={isSelected}
                                className={cn(
                                  "flex w-full items-start gap-3 rounded-lg bg-background/80 p-4 text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:text-base",
                                  !isGraded && "hover:bg-muted/50",
                                  !isGraded && isSelected && "bg-primary/10 ring-2 ring-primary",
                                  isGraded &&
                                    isCorrectChoice &&
                                    "bg-emerald-500/10 text-emerald-950 ring-2 ring-emerald-600 dark:text-emerald-100",
                                  isIncorrectSelection &&
                                    "bg-destructive/10 text-destructive ring-2 ring-destructive",
                                )}
                                disabled={isGraded}
                                key={`${choiceIndex}-${choice}`}
                                type="button"
                                onClick={() =>
                                  setResponses((currentResponses) => ({
                                    ...currentResponses,
                                    [questionIndex]: choice,
                                  }))
                                }
                              >
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                  {isGraded && isCorrectChoice ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : isIncorrectSelection ? (
                                    <XIcon className="size-3.5" />
                                  ) : (
                                    String.fromCharCode(65 + choiceIndex)
                                  )}
                                </span>
                                <span className="wrap-break-word min-w-0 flex-1">{choice}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  {answeredCount} of {questionCount} answered
                </p>
                {isGraded ? (
                  <Button onClick={handleReset} type="button" variant="secondary">
                    <RotateCcwIcon />
                    Try again
                  </Button>
                ) : (
                  <Button type="submit">
                    <CheckIcon />
                    Submit quiz
                  </Button>
                )}
              </div>
            </form>
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
