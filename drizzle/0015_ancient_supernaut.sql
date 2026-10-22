CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`notebook_id` text NOT NULL,
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
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`notebook_id` text NOT NULL,
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
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `studioTable`;