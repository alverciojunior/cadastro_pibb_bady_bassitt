CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`serviceId` int NOT NULL,
	`attendanceDate` date NOT NULL,
	`isPresent` boolean NOT NULL DEFAULT true,
	`notes` text,
	`registeredByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`dayOfWeek` enum('segunda','terca','quarta','quinta','sexta','sabado','domingo') NOT NULL,
	`time` varchar(5),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_children` ADD `ministry` varchar(100);--> statement-breakpoint
ALTER TABLE `member_updates` ADD `fieldName` varchar(100);--> statement-breakpoint
ALTER TABLE `member_updates` ADD `oldValue` text;--> statement-breakpoint
ALTER TABLE `member_updates` ADD `newValue` text;--> statement-breakpoint
ALTER TABLE `members` ADD `spouseIsTither` enum('sim','nao','ocasional');--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;