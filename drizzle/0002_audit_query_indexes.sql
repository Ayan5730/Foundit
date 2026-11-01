CREATE INDEX `claims_active_pair` ON `claims` (`owner_id`,`lost_report_id`,`found_report_id`,`status`);--> statement-breakpoint
CREATE INDEX `claims_status_created` ON `claims` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `claims_owner_created` ON `claims` (`owner_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `reports_match_lookup` ON `reports` (`event_id`,`kind`,`category`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `reports_owner_created` ON `reports` (`owner_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `reservations_claim` ON `reservations` (`claim_id`);