CREATE SCHEMA "biem";
--> statement-breakpoint
CREATE TYPE "biem"."accountRole" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "biem"."catalogCategory" AS ENUM('Producto', 'Servicio');--> statement-breakpoint
CREATE TYPE "biem"."quoteItemSource" AS ENUM('catalog', 'manual');--> statement-breakpoint
CREATE TYPE "biem"."quoteStatus" AS ENUM('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Completada', 'Cancelada');--> statement-breakpoint
CREATE TYPE "biem"."workspaceMemberStatus" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "biem"."workspaceRole" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "biem"."audit_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspaceId" varchar(36) NOT NULL,
	"actorUserId" integer,
	"entity" varchar(64) NOT NULL,
	"entityId" varchar(64) NOT NULL,
	"action" varchar(80) NOT NULL,
	"metadata" json,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biem"."business_profiles" (
	"workspaceId" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"ownerName" varchar(160) NOT NULL,
	"logoUrl" text,
	"email" varchar(320),
	"phone" varchar(64),
	"city" varchar(160),
	"conditions" text,
	"validityDays" integer DEFAULT 10 NOT NULL,
	"currencyCode" varchar(3) DEFAULT 'USD' NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"updatedByUserId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biem"."clients" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspaceId" varchar(36) NOT NULL,
	"name" varchar(160) NOT NULL,
	"company" varchar(200),
	"email" varchar(320),
	"phone" varchar(64),
	"address" text,
	"version" bigint DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"updatedByUserId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biem"."products" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspaceId" varchar(36) NOT NULL,
	"name" varchar(240) NOT NULL,
	"unit" varchar(80) NOT NULL,
	"category" "biem"."catalogCategory" NOT NULL,
	"costMinor" bigint DEFAULT 0 NOT NULL,
	"expensesMinor" bigint DEFAULT 0 NOT NULL,
	"marginBps" integer DEFAULT 0 NOT NULL,
	"taxRateBps" integer DEFAULT 0 NOT NULL,
	"netPriceMinor" bigint DEFAULT 0 NOT NULL,
	"suggestedPriceMinor" bigint DEFAULT 0 NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"updatedByUserId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biem"."quote_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"quoteId" varchar(36) NOT NULL,
	"productId" varchar(36),
	"source" "biem"."quoteItemSource" DEFAULT 'manual' NOT NULL,
	"name" varchar(240) NOT NULL,
	"unit" varchar(80) NOT NULL,
	"quantity" numeric(19, 4) NOT NULL,
	"unitPriceMinor" bigint NOT NULL,
	"taxRateBps" integer DEFAULT 0 NOT NULL,
	"lineSubtotalMinor" bigint NOT NULL,
	"lineTaxMinor" bigint NOT NULL,
	"lineTotalMinor" bigint NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biem"."quotes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspaceId" varchar(36) NOT NULL,
	"number" varchar(40) NOT NULL,
	"clientId" varchar(36),
	"clientNameSnapshot" varchar(200),
	"title" varchar(240) NOT NULL,
	"discountBps" integer DEFAULT 0 NOT NULL,
	"currencyCode" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotalMinor" bigint DEFAULT 0 NOT NULL,
	"discountMinor" bigint DEFAULT 0 NOT NULL,
	"taxMinor" bigint DEFAULT 0 NOT NULL,
	"totalMinor" bigint DEFAULT 0 NOT NULL,
	"issuedAt" date NOT NULL,
	"validUntil" date NOT NULL,
	"conditions" text,
	"status" "biem"."quoteStatus" DEFAULT 'Borrador' NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"updatedByUserId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biem"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "biem"."accountRole" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "biem"."workspace_members" (
	"workspaceId" varchar(36) NOT NULL,
	"userId" integer NOT NULL,
	"role" "biem"."workspaceRole" DEFAULT 'owner' NOT NULL,
	"status" "biem"."workspaceMemberStatus" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspaceId_userId_pk" PRIMARY KEY("workspaceId","userId")
);
--> statement-breakpoint
CREATE TABLE "biem"."workspace_sequences" (
	"workspaceId" varchar(36) PRIMARY KEY NOT NULL,
	"nextQuoteNumber" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biem"."workspaces" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"personalForUserId" integer,
	"createdByUserId" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "workspaces_personalForUserId_unique" UNIQUE("personalForUserId")
);
--> statement-breakpoint
ALTER TABLE "biem"."audit_events" ADD CONSTRAINT "audit_events_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."audit_events" ADD CONSTRAINT "audit_events_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."business_profiles" ADD CONSTRAINT "business_profiles_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."business_profiles" ADD CONSTRAINT "business_profiles_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."business_profiles" ADD CONSTRAINT "business_profiles_updatedByUserId_users_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."clients" ADD CONSTRAINT "clients_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."clients" ADD CONSTRAINT "clients_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."clients" ADD CONSTRAINT "clients_updatedByUserId_users_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."products" ADD CONSTRAINT "products_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."products" ADD CONSTRAINT "products_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."products" ADD CONSTRAINT "products_updatedByUserId_users_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quote_items" ADD CONSTRAINT "quote_items_quoteId_quotes_id_fk" FOREIGN KEY ("quoteId") REFERENCES "biem"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quote_items" ADD CONSTRAINT "quote_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "biem"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quotes" ADD CONSTRAINT "quotes_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quotes" ADD CONSTRAINT "quotes_clientId_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "biem"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quotes" ADD CONSTRAINT "quotes_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."quotes" ADD CONSTRAINT "quotes_updatedByUserId_users_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."workspace_members" ADD CONSTRAINT "workspace_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."workspace_sequences" ADD CONSTRAINT "workspace_sequences_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "biem"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."workspaces" ADD CONSTRAINT "workspaces_personalForUserId_users_id_fk" FOREIGN KEY ("personalForUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biem"."workspaces" ADD CONSTRAINT "workspaces_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "biem"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_workspaceId_createdAt_idx" ON "biem"."audit_events" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "biem"."audit_events" USING btree ("entity","entityId");--> statement-breakpoint
CREATE INDEX "clients_workspaceId_updatedAt_idx" ON "biem"."clients" USING btree ("workspaceId","updatedAt");--> statement-breakpoint
CREATE INDEX "products_workspaceId_updatedAt_idx" ON "biem"."products" USING btree ("workspaceId","updatedAt");--> statement-breakpoint
CREATE INDEX "quote_items_quoteId_position_idx" ON "biem"."quote_items" USING btree ("quoteId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_workspaceId_number_unique" ON "biem"."quotes" USING btree ("workspaceId","number");--> statement-breakpoint
CREATE INDEX "quotes_workspaceId_updatedAt_idx" ON "biem"."quotes" USING btree ("workspaceId","updatedAt");--> statement-breakpoint
CREATE INDEX "quotes_workspaceId_status_idx" ON "biem"."quotes" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "workspace_members_userId_idx" ON "biem"."workspace_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "workspaces_createdByUserId_idx" ON "biem"."workspaces" USING btree ("createdByUserId");