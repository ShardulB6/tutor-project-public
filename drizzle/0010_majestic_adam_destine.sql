CREATE TABLE `files` (
	`title` text NOT NULL,
	`id` text NOT NULL,
	`notebook_id` text NOT NULL,
	`userID` text NOT NULL,
	`size` integer,
	`data` text,
	`storage_key` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
