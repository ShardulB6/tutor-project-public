PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chatSessions` (
	`notebook_id` text NOT NULL,
	`session_id` text NOT NULL,
	`name` text DEFAULT 'New chat' NOT NULL,
	`title_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`notebook_id`, `session_id`),
	FOREIGN KEY (`notebook_id`) REFERENCES `notebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chatSessions` (
	"notebook_id",
	"session_id",
	"name",
	"title_status",
	"created_at",
	"updated_at"
)
SELECT
	`assistant_messages`.`notebook_id`,
	`assistant_messages`.`session_id`,
	COALESCE(`chatSessions`.`name`, 'New chat'),
	CASE WHEN `chatSessions`.`name` IS NULL THEN 'pending' ELSE 'complete' END,
	CAST(MIN(`assistant_messages`.`created_at`) / 1000 AS integer),
	CAST(MAX(`assistant_messages`.`updated_at`) / 1000 AS integer)
FROM `assistant_messages`
LEFT JOIN `chatSessions`
	ON `chatSessions`.`session_id` = `assistant_messages`.`session_id`
GROUP BY
	`assistant_messages`.`notebook_id`,
	`assistant_messages`.`session_id`,
	`chatSessions`.`name`;--> statement-breakpoint
DROP TABLE `chatSessions`;--> statement-breakpoint
ALTER TABLE `__new_chatSessions` RENAME TO `chatSessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `chat_sessions_notebook_updated_idx` ON `chatSessions` (`notebook_id`,`updated_at`);
