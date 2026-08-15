CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evolutionApiUrl` varchar(512) NOT NULL,
	`evolutionApiKey` varchar(256) NOT NULL,
	`instanceName` varchar(128) NOT NULL DEFAULT 'pibb',
	`isConnected` boolean NOT NULL DEFAULT false,
	`welcomeMessageEnabled` boolean NOT NULL DEFAULT true,
	`birthdayMessageEnabled` boolean NOT NULL DEFAULT true,
	`birthdayCronTaskUid` varchar(65),
	`welcomeMessage` text,
	`birthdayMessage` text,
	`leadershipPhone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int,
	`memberName` varchar(255),
	`phone` varchar(30) NOT NULL,
	`messageType` varchar(50) NOT NULL,
	`messageContent` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_children` ADD `isBaptized` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `member_children` ADD `baptismDate` date;--> statement-breakpoint
ALTER TABLE `members` ADD `spouseBaptismDate` date;