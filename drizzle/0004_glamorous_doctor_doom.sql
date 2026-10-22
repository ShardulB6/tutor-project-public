PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`roles` text NOT NULL,
	`message` text NOT NULL,
	`threadID` text NOT NULL,
	FOREIGN KEY (`threadID`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "roles", "message", "threadID") SELECT "id", "roles", "message", "threadID" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_notebook` (
	`title` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`userID` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_notebook`("title", "id", "userID", "created_at", "updated_at") SELECT "title", "id", "userID", "created_at", "updated_at" FROM `notebook`;--> statement-breakpoint
DROP TABLE `notebook`;--> statement-breakpoint
ALTER TABLE `__new_notebook` RENAME TO `notebook`;--> statement-breakpoint
CREATE TABLE `__new_threads` (
	`title` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`notebookID` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`notebookID`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_threads`("title", "id", "notebookID", "created_at", "updated_at") SELECT "title", "id", "notebookID", "created_at", "updated_at" FROM `threads`;--> statement-breakpoint
DROP TABLE `threads`;--> statement-breakpoint
ALTER TABLE `__new_threads` RENAME TO `threads`;