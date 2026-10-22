CREATE TABLE `assistant_compactions` (
	`notebook_id` text NOT NULL,
	`session_id` text NOT NULL,
	`id` text NOT NULL,
	`summary` text NOT NULL,
	`from_message_id` text NOT NULL,
	`to_message_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`notebook_id`, `session_id`, `id`),
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_compactions_notebook_session_from_idx` ON `assistant_compactions` (`notebook_id`,`session_id`,`from_message_id`);--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`notebook_id` text NOT NULL,
	`session_id` text NOT NULL,
	`id` text NOT NULL,
	`parent_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`text_content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`notebook_id`, `session_id`, `id`),
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_messages_notebook_session_parent_idx` ON `assistant_messages` (`notebook_id`,`session_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `assistant_messages_notebook_session_created_idx` ON `assistant_messages` (`notebook_id`,`session_id`,`created_at`);