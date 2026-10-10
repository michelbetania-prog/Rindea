CREATE TABLE `audit_events` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`actorUserId` int,
	`entity` varchar(64) NOT NULL,
	`entityId` varchar(64) NOT NULL,
	`action` varchar(80) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`workspaceId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`ownerName` varchar(160) NOT NULL,
	`logoUrl` text,
	`email` varchar(320),
	`phone` varchar(64),
	`city` varchar(160),
	`conditions` text,
	`validityDays` int NOT NULL DEFAULT 10,
	`currencyCode` varchar(3) NOT NULL DEFAULT 'USD',
	`version` bigint NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `business_profiles_workspaceId` PRIMARY KEY(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`company` varchar(200),
	`email` varchar(320),
	`phone` varchar(64),
	`address` text,
	`version` bigint NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`name` varchar(240) NOT NULL,
	`unit` varchar(80) NOT NULL,
	`catalogCategory` enum('Producto','Servicio') NOT NULL,
	`costMinor` bigint NOT NULL DEFAULT 0,
	`expensesMinor` bigint NOT NULL DEFAULT 0,
	`marginBps` int NOT NULL DEFAULT 0,
	`taxRateBps` int NOT NULL DEFAULT 0,
	`netPriceMinor` bigint NOT NULL DEFAULT 0,
	`suggestedPriceMinor` bigint NOT NULL DEFAULT 0,
	`version` bigint NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` varchar(36) NOT NULL,
	`quoteId` varchar(36) NOT NULL,
	`productId` varchar(36),
	`quoteItemSource` enum('catalog','manual') NOT NULL DEFAULT 'manual',
	`name` varchar(240) NOT NULL,
	`unit` varchar(80) NOT NULL,
	`quantity` decimal(19,4) NOT NULL,
	`unitPriceMinor` bigint NOT NULL,
	`taxRateBps` int NOT NULL DEFAULT 0,
	`lineSubtotalMinor` bigint NOT NULL,
	`lineTaxMinor` bigint NOT NULL,
	`lineTotalMinor` bigint NOT NULL,
	`position` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`number` varchar(40) NOT NULL,
	`clientId` varchar(36),
	`clientNameSnapshot` varchar(200),
	`title` varchar(240) NOT NULL,
	`discountBps` int NOT NULL DEFAULT 0,
	`currencyCode` varchar(3) NOT NULL DEFAULT 'USD',
	`subtotalMinor` bigint NOT NULL DEFAULT 0,
	`discountMinor` bigint NOT NULL DEFAULT 0,
	`taxMinor` bigint NOT NULL DEFAULT 0,
	`totalMinor` bigint NOT NULL DEFAULT 0,
	`issuedAt` date NOT NULL,
	`validUntil` date NOT NULL,
	`conditions` text,
	`quoteStatus` enum('Borrador','Enviada','Aprobada','Rechazada','Completada','Cancelada') NOT NULL DEFAULT 'Borrador',
	`version` bigint NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_workspaceId_number_unique` UNIQUE(`workspaceId`,`number`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspaceId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`workspaceRole` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'owner',
	`workspaceMemberStatus` enum('active','invited','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_members_workspaceId_userId_pk` PRIMARY KEY(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_sequences` (
	`workspaceId` varchar(36) NOT NULL,
	`nextQuoteNumber` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_sequences_workspaceId` PRIMARY KEY(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`personalForUserId` int,
	`createdByUserId` int NOT NULL,
	`version` bigint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_personalForUserId_unique` UNIQUE(`personalForUserId`)
);
--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD CONSTRAINT `business_profiles_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD CONSTRAINT `business_profiles_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD CONSTRAINT `business_profiles_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_quoteId_quotes_id_fk` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_sequences` ADD CONSTRAINT `workspace_sequences_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_personalForUserId_users_id_fk` FOREIGN KEY (`personalForUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_events_workspaceId_createdAt_idx` ON `audit_events` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `clients_workspaceId_updatedAt_idx` ON `clients` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `products_workspaceId_updatedAt_idx` ON `products` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `quote_items_quoteId_position_idx` ON `quote_items` (`quoteId`,`position`);--> statement-breakpoint
CREATE INDEX `quotes_workspaceId_updatedAt_idx` ON `quotes` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `quotes_workspaceId_status_idx` ON `quotes` (`workspaceId`,`quoteStatus`);--> statement-breakpoint
CREATE INDEX `workspace_members_userId_idx` ON `workspace_members` (`userId`);--> statement-breakpoint
CREATE INDEX `workspaces_createdByUserId_idx` ON `workspaces` (`createdByUserId`);