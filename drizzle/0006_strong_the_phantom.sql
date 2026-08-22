ALTER TABLE `email_alert_settings` ADD `emailFrom` varchar(320);--> statement-breakpoint
ALTER TABLE `email_alert_settings` ADD `resendApiKeyEncrypted` text;--> statement-breakpoint
ALTER TABLE `email_alert_settings` ADD `resendApiKeyIv` varchar(64);