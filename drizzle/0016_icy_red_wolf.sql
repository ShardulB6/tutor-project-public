PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`notebook_id` text NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`questions` text NOT NULL,
	`source_file_ids` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`model` text,
	`error` text,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`title_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notebook_id`,`session_id`) REFERENCES `chatSessions`(`notebook_id`,`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exams`("id", "notebook_id", "session_id", "title", "questions", "source_file_ids", "settings", "model", "error", "schema_version", "title_status", "created_at", "updated_at") SELECT "id", "notebook_id", "session_id", "title", "questions", "source_file_ids", "settings", "model", "error", "schema_version", "title_status", "created_at", "updated_at" FROM `exams`;--> statement-breakpoint
DROP TABLE `exams`;--> statement-breakpoint
ALTER TABLE `__new_exams` RENAME TO `exams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`notebook_id` text NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`cards` text NOT NULL,
	`source_file_ids` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`model` text,
	`error` text,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`title_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notebook_id`,`session_id`) REFERENCES `chatSessions`(`notebook_id`,`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_flashcards`("id", "notebook_id", "session_id", "title", "cards", "source_file_ids", "settings", "model", "error", "schema_version", "title_status", "created_at", "updated_at") SELECT "id", "notebook_id", "session_id", "title", "cards", "source_file_ids", "settings", "model", "error", "schema_version", "title_status", "created_at", "updated_at" FROM `flashcards`;--> statement-breakpoint
DROP TABLE `flashcards`;--> statement-breakpoint
ALTER TABLE `__new_flashcards` RENAME TO `flashcards`;