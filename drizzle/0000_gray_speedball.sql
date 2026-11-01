CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_request_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`lost_report_id` text NOT NULL,
	`found_report_id` text NOT NULL,
	`evidence` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lost_report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`found_report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claims_owner_request` ON `claims` (`owner_id`,`client_request_id`);--> statement-breakpoint
CREATE TABLE `guidance_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`object_key` text,
	`content_type` text,
	`suggestions` text NOT NULL,
	`providers` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `private_reports` (
	`report_id` text PRIMARY KEY NOT NULL,
	`private_clue` text,
	`intake_id` text,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`intake_id`) REFERENCES `intakes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_request_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`color` text,
	`description` text NOT NULL,
	`visible_features` text NOT NULL,
	`location` text NOT NULL,
	`occurred_at` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_owner_request` ON `reports` (`owner_id`,`client_request_id`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`report_id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_once` ON `review_events` (`claim_id`,`action`);