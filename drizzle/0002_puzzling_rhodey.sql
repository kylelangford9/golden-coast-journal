PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`note` text NOT NULL,
	`corrected_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_corrections`("id", "article_id", "note", "corrected_at") SELECT "id", "article_id", "note", "corrected_at" FROM `corrections`;--> statement-breakpoint
DROP TABLE `corrections`;--> statement-breakpoint
ALTER TABLE `__new_corrections` RENAME TO `corrections`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_corrections_article` ON `corrections` (`article_id`);--> statement-breakpoint
CREATE TABLE `__new_story_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`published_at` text,
	`discovered_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_story_candidates`("id", "source_id", "external_url", "title", "summary", "published_at", "discovered_at", "status", "score") SELECT "id", "source_id", "external_url", "title", "summary", "published_at", "discovered_at", "status", "score" FROM `story_candidates`;--> statement-breakpoint
DROP TABLE `story_candidates`;--> statement-breakpoint
ALTER TABLE `__new_story_candidates` RENAME TO `story_candidates`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_candidates_external_url` ON `story_candidates` (`external_url`);--> statement-breakpoint
CREATE INDEX `idx_candidates_status_score` ON `story_candidates` (`status`,`score`);