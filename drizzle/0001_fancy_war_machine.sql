CREATE TABLE `families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyCode` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `families_id` PRIMARY KEY(`id`),
	CONSTRAINT `families_familyCode_unique` UNIQUE(`familyCode`)
);
--> statement-breakpoint
CREATE TABLE `member_children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`familyId` int,
	`fullName` varchar(255) NOT NULL,
	`birthDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`updatedByUserId` int,
	`changeType` enum('create','update','classify') NOT NULL,
	`changeDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int,
	`fullName` varchar(255) NOT NULL,
	`birthDate` date,
	`gender` enum('masculino','feminino','outro'),
	`maritalStatus` enum('solteiro','casado','uniao_estavel','divorciado','viuvo'),
	`cpf` varchar(14),
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`email` varchar(320),
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(100),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`congregation` varchar(100),
	`ministry` varchar(100),
	`isBaptized` boolean DEFAULT false,
	`baptismDate` date,
	`isTither` enum('sim','nao','ocasional'),
	`attendanceFrequency` enum('sempre','quase_sempre','as_vezes','raramente','nunca'),
	`serviceArea` varchar(255),
	`gifts` text,
	`spouseName` varchar(255),
	`spouseBirthDate` date,
	`spousePhone` varchar(20),
	`spouseWhatsapp` varchar(20),
	`spouseEmail` varchar(320),
	`spouseIsBaptized` boolean DEFAULT false,
	`spouseMinistry` varchar(100),
	`spouseServiceArea` varchar(255),
	`memberType` enum('membro_ativo','frequentante','visitante','afastado') DEFAULT 'visitante',
	`pastoralNotes` text,
	`aiPastoralSuggestions` text,
	`hasDuplicate` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`registeredByUserId` int,
	`lastUpdatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_children` ADD CONSTRAINT `member_children_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_children` ADD CONSTRAINT `member_children_familyId_families_id_fk` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_updates` ADD CONSTRAINT `member_updates_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_familyId_families_id_fk` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE no action ON UPDATE no action;