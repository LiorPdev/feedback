DROP INDEX `Feedback_songId_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `Feedback_songId_authorId_idx` ON `Feedback` (`songId`,`authorId`);--> statement-breakpoint
CREATE INDEX `Feedback_createdAt_idx` ON `Feedback` (`createdAt`);--> statement-breakpoint
CREATE INDEX `Song_createdAt_idx` ON `Song` (`createdAt`);--> statement-breakpoint
CREATE INDEX `User_createdAt_idx` ON `User` (`createdAt`);