CREATE TABLE `service_usage` (
	`bucket` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_usage_expires` ON `service_usage` (`expires`);--> statement-breakpoint
CREATE INDEX `points_ledger_user_created` ON `points_ledger` (`user_id`,`created`);