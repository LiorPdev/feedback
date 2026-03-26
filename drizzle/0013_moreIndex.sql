CREATE INDEX `Feedback_songId_createdAt_idx` ON `Feedback` (`songId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Song_userId_createdAt_idx` ON `Song` (`userId`,`createdAt`);