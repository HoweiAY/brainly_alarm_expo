CREATE TABLE `alarms` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`days` text NOT NULL,
	`hour` integer NOT NULL,
	`minute` integer NOT NULL,
	`task` text NOT NULL,
	`rounds` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`sound` text,
	`is_snooze` integer NOT NULL,
	`is_enabled` integer NOT NULL
);
