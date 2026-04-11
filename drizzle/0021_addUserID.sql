ALTER TABLE `User` ADD `clerkId` text;--> statement-breakpoint
CREATE UNIQUE INDEX `User_clerkId_unique` ON `User` (`clerkId`);