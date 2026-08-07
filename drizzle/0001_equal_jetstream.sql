CREATE TABLE `scheduled_alarms` (
	`id` text PRIMARY KEY NOT NULL,
	`alarm_id` text NOT NULL,
	`weekday` integer,
	`type` text NOT NULL,
	`trigger_at` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
