PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`songId` text NOT NULL,
	`authorId` text,
	`cat1` integer NOT NULL,
	`cat2` integer NOT NULL,
	`cat3` integer NOT NULL,
	`overall` integer NOT NULL,
	`comment` text NOT NULL,
	`playedSeconds` integer,
	`isUnlocked` integer DEFAULT false NOT NULL,
	`isLiked` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Feedback`("id", "songId", "authorId", "cat1", "cat2", "cat3", "overall", "comment", "playedSeconds", "isUnlocked", "isLiked", "createdAt") SELECT "id", "songId", "authorId", "cat1", "cat2", "cat3", "overall", "comment", "playedSeconds", "isUnlocked", "isLiked", "createdAt" FROM `Feedback`;--> statement-breakpoint
DROP TABLE `Feedback`;--> statement-breakpoint
ALTER TABLE `__new_Feedback` RENAME TO `Feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `Feedback_songId_authorId_idx` ON `Feedback` (`songId`,`authorId`);--> statement-breakpoint
CREATE INDEX `Feedback_songId_createdAt_idx` ON `Feedback` (`songId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Feedback_authorId_idx` ON `Feedback` (`authorId`);--> statement-breakpoint
CREATE INDEX `Feedback_createdAt_idx` ON `Feedback` (`createdAt`);