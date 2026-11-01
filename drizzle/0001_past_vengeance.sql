ALTER TABLE `intakes` ADD `shared_preview_key` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `has_shared_preview` integer DEFAULT 0 NOT NULL;