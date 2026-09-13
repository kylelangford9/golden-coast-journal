CREATE TABLE `editorial_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`action` text NOT NULL,
	`actor` text DEFAULT 'editorial-api' NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_editorial_actions_article_created` ON `editorial_actions` (`article_id`,`created_at`);