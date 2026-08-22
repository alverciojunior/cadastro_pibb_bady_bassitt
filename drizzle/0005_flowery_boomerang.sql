CREATE TABLE `email_alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`primaryEmail` varchar(320) NOT NULL,
	`optionalEmail1` varchar(320),
	`optionalEmail2` varchar(320),
	`optionalEmail3` varchar(320),
	`optionalEmail4` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_alert_settings_id` PRIMARY KEY(`id`)
);
