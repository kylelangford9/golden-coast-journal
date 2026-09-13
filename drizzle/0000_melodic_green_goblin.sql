CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`section` text NOT NULL,
	`title` text NOT NULL,
	`dek` text NOT NULL,
	`body_json` text NOT NULL,
	`key_points_json` text DEFAULT '[]' NOT NULL,
	`author` text NOT NULL,
	`image_url` text,
	`image_alt` text,
	`image_credit` text,
	`sources_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`published_at` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_slug` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_articles_status_published` ON `articles` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_articles_section_published` ON `articles` (`section`,`published_at`);--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`note` text NOT NULL,
	`corrected_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_corrections_article` ON `corrections` (`article_id`);--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_type` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_pipeline_runs_started` ON `pipeline_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`feed_url` text NOT NULL,
	`homepage_url` text NOT NULL,
	`section` text NOT NULL,
	`trust_tier` integer DEFAULT 2 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_fetched_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sources_feed_url` ON `sources` (`feed_url`);--> statement-breakpoint
CREATE TABLE `story_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`published_at` text,
	`discovered_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_candidates_external_url` ON `story_candidates` (`external_url`);--> statement-breakpoint
CREATE INDEX `idx_candidates_status_score` ON `story_candidates` (`status`,`score`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`confirmed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscribers_email` ON `subscribers` (`email`);