CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`roles` text NOT NULL,
	`message` text NOT NULL,
	`threadID` text,
	FOREIGN KEY (`threadID`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notebook` (
	`title` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`title` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`notebookID` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`notebookID`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `todos`;