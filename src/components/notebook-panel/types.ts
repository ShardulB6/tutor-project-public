import type { Flashcard, FlashcardsId, QuizId, QuizQuestion } from "#/db/studio.schema";
import type { FileId } from "#/lib/functions/file.functions";

export type NotebookFile = {
  id: FileId;
  title: string;
  topics: string[];
};

export type StudioObject =
  | { createdAt: Date; id: QuizId; title: string; type: "quiz" }
  | { createdAt: Date; id: FlashcardsId; title: string; type: "flashcards" };

export type StudioType = StudioObject["type"];
export type LoadedQuiz = { id: QuizId; questions: QuizQuestion[]; title: string };
export type LoadedFlashcardSet = { cards: Flashcard[]; id: FlashcardsId; title: string };
export type RefreshStudioObjects = () => Promise<boolean>;
