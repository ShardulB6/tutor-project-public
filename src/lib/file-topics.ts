import { z } from "zod";

export const MAX_FILE_TOPICS = 20;
export const MAX_FILE_TOPIC_LENGTH = 80;

const fileTopicSchema = z
  .string()
  .transform((topic) => topic.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(MAX_FILE_TOPIC_LENGTH));

export const fileTopicsSchema = z
  .array(fileTopicSchema)
  .max(MAX_FILE_TOPICS)
  .transform((topics) => {
    const uniqueTopics = new Map<string, string>();

    for (const topic of topics) {
      const key = topic.toLowerCase();
      if (!uniqueTopics.has(key)) {
        uniqueTopics.set(key, topic);
      }
    }

    return [...uniqueTopics.values()];
  });

export function parseFileTopicsInput(input: string): string[] {
  return fileTopicsSchema.parse(input.split(",").filter((topic) => topic.trim().length > 0));
}

export function parseStoredFileTopics(storedTopics: string): string[] {
  let topics: unknown = storedTopics.split(",").filter((topic) => topic.trim().length > 0);

  try {
    const parsedTopics: unknown = JSON.parse(storedTopics);

    if (Array.isArray(parsedTopics)) {
      topics = parsedTopics;
    } else if (typeof parsedTopics === "string") {
      topics = parsedTopics.split(",").filter((topic) => topic.trim().length > 0);
    } else {
      topics = [];
    }
  } catch {
    // Legacy rows may contain comma-separated text instead of JSON.
  }

  const result = fileTopicsSchema.safeParse(topics);
  return result.success ? result.data : [];
}

export function serializeFileTopics(topics: string[]): string {
  return JSON.stringify(fileTopicsSchema.parse(topics));
}
