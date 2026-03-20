CREATE TABLE `Feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`songId` text NOT NULL,
	`authorId` text,
	`lyrics` integer NOT NULL,
	`composition` integer NOT NULL,
	`production` integer NOT NULL,
	`overall` integer NOT NULL,
	`comment` text NOT NULL,
	`playedSeconds` integer,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Feedback_songId_idx` ON `Feedback` (`songId`);--> statement-breakpoint
CREATE INDEX `Feedback_authorId_idx` ON `Feedback` (`authorId`);--> statement-breakpoint
CREATE TABLE `Song` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`genre` text NOT NULL,
	`slug` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Song_url_unique` ON `Song` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `Song_slug_unique` ON `Song` (`slug`);--> statement-breakpoint
CREATE INDEX `Song_userId_idx` ON `Song` (`userId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`provider` text,
	`providerId` text,
	`tokens` integer DEFAULT 50 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_providerId_unique` ON `User` (`providerId`);