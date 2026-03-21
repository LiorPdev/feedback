CREATE TABLE `Log` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`source` text,
	`userId` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Log_createdAt_idx` ON `Log` (`createdAt`);