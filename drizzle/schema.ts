import {
  bigint,
  date,
  decimal,
  index,
  integer,
  serial,
  pgSchema,
  json,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/** Private application schema; only the backend connects to these tables. */
export const biem = pgSchema("biem");
export const accountRole = biem.enum("accountRole", ["user", "admin"]);

/** Identity record populated after Supabase validates the account. */
export const users = biem.table("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: accountRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceRole = biem.enum("workspaceRole", ["owner", "admin", "editor", "viewer"]);
export const workspaceMemberStatus = biem.enum("workspaceMemberStatus", ["active", "invited", "suspended"]);
export const catalogCategory = biem.enum("catalogCategory", ["Producto", "Servicio"]);
export const quoteStatus = biem.enum("quoteStatus", ["Borrador", "Enviada", "Aprobada", "Rechazada", "Completada", "Cancelada"]);
export const quoteItemSource = biem.enum("quoteItemSource", ["catalog", "manual"]);

/** A business boundary. Every commercial record belongs to exactly one workspace. */
export const workspaces = biem.table("workspaces", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  /** Guarantees idempotent provision of the initial personal workspace for a user. */
  personalForUserId: integer("personalForUserId").references(() => users.id).unique(),
  createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
}, (table) => [
  index("workspaces_createdByUserId_idx").on(table.createdByUserId),
]);

export const workspaceMembers = biem.table("workspace_members", {
  workspaceId: varchar("workspaceId", { length: 36 }).notNull().references(() => workspaces.id),
  userId: integer("userId").notNull().references(() => users.id),
  role: workspaceRole("role").notNull().default("owner"),
  status: workspaceMemberStatus("status").notNull().default("active"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  primaryKey({ columns: [table.workspaceId, table.userId] }),
  index("workspace_members_userId_idx").on(table.userId),
]);

export const businessProfiles = biem.table("business_profiles", {
  workspaceId: varchar("workspaceId", { length: 36 }).primaryKey().references(() => workspaces.id),
  name: varchar("name", { length: 160 }).notNull(),
  ownerName: varchar("ownerName", { length: 160 }).notNull(),
  logoUrl: text("logoUrl"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  city: varchar("city", { length: 160 }),
  conditions: text("conditions"),
  validityDays: integer("validityDays").notNull().default(10),
  /** A configurable default; existing UI formatting remains unchanged until repository migration. */
  currencyCode: varchar("currencyCode", { length: 3 }).notNull().default("USD"),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
  updatedByUserId: integer("updatedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
});

export const products = biem.table("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull().references(() => workspaces.id),
  name: varchar("name", { length: 240 }).notNull(),
  unit: varchar("unit", { length: 80 }).notNull(),
  category: catalogCategory("category").notNull(),
  costMinor: bigint("costMinor", { mode: "number" }).notNull().default(0),
  expensesMinor: bigint("expensesMinor", { mode: "number" }).notNull().default(0),
  marginBps: integer("marginBps").notNull().default(0),
  taxRateBps: integer("taxRateBps").notNull().default(0),
  netPriceMinor: bigint("netPriceMinor", { mode: "number" }).notNull().default(0),
  suggestedPriceMinor: bigint("suggestedPriceMinor", { mode: "number" }).notNull().default(0),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
  updatedByUserId: integer("updatedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
}, (table) => [
  index("products_workspaceId_updatedAt_idx").on(table.workspaceId, table.updatedAt),
]);

export const clients = biem.table("clients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull().references(() => workspaces.id),
  name: varchar("name", { length: 160 }).notNull(),
  company: varchar("company", { length: 200 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  address: text("address"),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
  updatedByUserId: integer("updatedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
}, (table) => [
  index("clients_workspaceId_updatedAt_idx").on(table.workspaceId, table.updatedAt),
]);

export const quotes = biem.table("quotes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull().references(() => workspaces.id),
  number: varchar("number", { length: 40 }).notNull(),
  clientId: varchar("clientId", { length: 36 }).references(() => clients.id),
  clientNameSnapshot: varchar("clientNameSnapshot", { length: 200 }),
  title: varchar("title", { length: 240 }).notNull(),
  discountBps: integer("discountBps").notNull().default(0),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull().default("USD"),
  subtotalMinor: bigint("subtotalMinor", { mode: "number" }).notNull().default(0),
  discountMinor: bigint("discountMinor", { mode: "number" }).notNull().default(0),
  taxMinor: bigint("taxMinor", { mode: "number" }).notNull().default(0),
  totalMinor: bigint("totalMinor", { mode: "number" }).notNull().default(0),
  issuedAt: date("issuedAt", { mode: "string" }).notNull(),
  validUntil: date("validUntil", { mode: "string" }).notNull(),
  conditions: text("conditions"),
  status: quoteStatus("status").notNull().default("Borrador"),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
  updatedByUserId: integer("updatedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
}, (table) => [
  uniqueIndex("quotes_workspaceId_number_unique").on(table.workspaceId, table.number),
  index("quotes_workspaceId_updatedAt_idx").on(table.workspaceId, table.updatedAt),
  index("quotes_workspaceId_status_idx").on(table.workspaceId, table.status),
]);

export const quoteItems = biem.table("quote_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  quoteId: varchar("quoteId", { length: 36 }).notNull().references(() => quotes.id),
  productId: varchar("productId", { length: 36 }).references(() => products.id),
  source: quoteItemSource("source").notNull().default("manual"),
  name: varchar("name", { length: 240 }).notNull(),
  unit: varchar("unit", { length: 80 }).notNull(),
  quantity: decimal("quantity", { precision: 19, scale: 4 }).notNull(),
  unitPriceMinor: bigint("unitPriceMinor", { mode: "number" }).notNull(),
  taxRateBps: integer("taxRateBps").notNull().default(0),
  lineSubtotalMinor: bigint("lineSubtotalMinor", { mode: "number" }).notNull(),
  lineTaxMinor: bigint("lineTaxMinor", { mode: "number" }).notNull(),
  lineTotalMinor: bigint("lineTotalMinor", { mode: "number" }).notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("quote_items_quoteId_position_idx").on(table.quoteId, table.position),
]);

export const workspaceSequences = biem.table("workspace_sequences", {
  workspaceId: varchar("workspaceId", { length: 36 }).primaryKey().references(() => workspaces.id),
  nextQuoteNumber: integer("nextQuoteNumber").notNull().default(1),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const auditEvents = biem.table("audit_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 36 }).notNull().references(() => workspaces.id),
  actorUserId: integer("actorUserId").references(() => users.id),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_events_workspaceId_createdAt_idx").on(table.workspaceId, table.createdAt),
  index("audit_events_entity_idx").on(table.entity, table.entityId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type ClientRecord = typeof clients.$inferSelect;
export type QuoteRecord = typeof quotes.$inferSelect;
export type QuoteItemRecord = typeof quoteItems.$inferSelect;
