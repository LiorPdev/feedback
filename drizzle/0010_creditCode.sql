CREATE TABLE `CreditCode` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`amount` integer NOT NULL,
	`senderId` text NOT NULL,
	`isRedeemed` integer DEFAULT false NOT NULL,
	`redeemerId` text,
	`createdAt` text NOT NULL,
	`expiresAt` text,
	FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`redeemerId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CreditCode_code_unique` ON `CreditCode` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `CreditCode_code_idx` ON `CreditCode` (`code`);--> statement-breakpoint
CREATE INDEX `CreditCode_senderId_idx` ON `CreditCode` (`senderId`);