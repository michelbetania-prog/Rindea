import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  businessProfiles,
  type InsertUser,
  type User,
  type Workspace,
  type WorkspaceMember,
  users,
  workspaceMembers,
  workspaces,
  workspaceSequences,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
      const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
      _db = drizzle(postgres(process.env.DATABASE_URL, {
        prepare: false, // Required by the Supabase transaction pooler.
        max: 3,
        connect_timeout: 10,
        idle_timeout: 20,
        ssl: local ? false : {
          rejectUnauthorized: true,
          ...(process.env.PGSSLROOTCERT ? { ca: readFileSync(process.env.PGSSLROOTCERT, "utf8") } : {}),
        },
      }));
    } catch {
      console.warn("[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type WorkspaceAccess = {
  workspace: Workspace;
  membership: WorkspaceMember;
};

/**
 * Resolves the secure default workspace for a signed-in account. The unique
 * personalForUserId column makes duplicate login callbacks safe to retry.
 */
export async function getOrCreatePersonalWorkspace(user: User): Promise<WorkspaceAccess | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot provision workspace: database not available");
    return null;
  }

  const existing = await db
    .select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, user.id)),
    )
    .where(eq(workspaces.personalForUserId, user.id))
    .limit(1);

  if (existing[0]) return existing[0];

  const workspaceId = randomUUID();
  const ownerName = user.name?.trim() || "Mi negocio";
  const businessName = user.name?.trim() ? `${user.name.trim()} · BIEM` : "Mi negocio";

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      name: businessName,
      personalForUserId: user.id,
      createdByUserId: user.id,
    }).onConflictDoUpdate({ target: workspaces.personalForUserId, set: { updatedAt: new Date() } });

    const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.personalForUserId, user.id)).limit(1);
    if (!workspace) throw new Error("Workspace provisioning failed");

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      status: "active",
    }).onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });

    await tx.insert(businessProfiles).values({
      workspaceId: workspace.id,
      name: businessName,
      ownerName,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    }).onConflictDoNothing({ target: businessProfiles.workspaceId });

    await tx.insert(workspaceSequences).values({ workspaceId: workspace.id, nextQuoteNumber: 1 })
      .onConflictDoNothing({ target: workspaceSequences.workspaceId });
  });

  const created = await db
    .select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, user.id)),
    )
    .where(eq(workspaces.personalForUserId, user.id))
    .limit(1);

  return created[0] ?? null;
}
