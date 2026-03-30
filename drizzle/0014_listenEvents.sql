CREATE TABLE `ListenEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`songId` text NOT NULL,
	`userId` text,
	`playedSeconds` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ListenEvent_songId_idx` ON `ListenEvent` (`songId`);--> statement-breakpoint
CREATE INDEX `ListenEvent_userId_idx` ON `ListenEvent` (`userId`);--> statement-breakpoint
CREATE INDEX `ListenEvent_songId_createdAt_idx` ON `ListenEvent` (`songId`,`createdAt`);
