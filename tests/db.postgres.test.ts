import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Real database integration checks are opt-in; never use a production connection.
describe.skipIf(!process.env.DATABASE_TEST_URL)("PostgreSQL workspace persistence", () => {
  let sql: ReturnType<typeof postgres>;
  let db: typeof import("../server/db");
  let userA: NonNullable<Awaited<ReturnType<typeof import("../server/db").getUserByOpenId>>>;

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_TEST_URL!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Use an isolated loopback database with a name ending in _test");
    vi.stubEnv("DATABASE_URL", url.toString());
    sql = postgres(url.toString(), { prepare: false, max: 3, onnotice: () => undefined });
    await migrate(drizzle(sql), { migrationsFolder: "drizzle/postgres" });
    await sql.unsafe('TRUNCATE TABLE "biem"."users" RESTART IDENTITY CASCADE');
    await sql.unsafe("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$");
    db = await import("../server/db");
    await db.upsertUser({ openId: "supabase:test-a", email: "a@example.com", name: "Account A" });
    userA = (await db.getUserByOpenId("supabase:test-a"))!;
  }, 30000);

  afterAll(async () => {
    await sql?.end();
    vi.unstubAllEnvs();
  });

  it("applies both migrations again without duplicating schema or tables", async () => {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle/postgres" });
    const rows = await sql`select count(*)::int as count from information_schema.tables where table_schema='biem'`;
    expect(rows[0].count).toBe(10);
  });

  it("upserts a stable account without allocating a second user", async () => {
    await db.upsertUser({ openId: userA.openId, name: "Updated Account A" });
    const again = await db.getUserByOpenId(userA.openId);
    expect(again?.id).toBe(userA.id);
    expect(again?.name).toBe("Updated Account A");
  });

  it("provisions one personal workspace even with concurrent login attempts", async () => {
    const attempts = await Promise.all(Array.from({ length: 4 }, () => db.getOrCreatePersonalWorkspace(userA)));
    expect(new Set(attempts.map((value) => value?.workspace.id)).size).toBe(1);
    expect(attempts[0]?.membership).toMatchObject({ role: "owner", status: "active", userId: userA.id });
    const rows = await sql`select count(*)::int as count from biem.business_profiles`;
    expect(rows[0].count).toBe(1);
  });

  it("keeps a second account in a distinct workspace", async () => {
    await db.upsertUser({ openId: "supabase:test-b", name: "Account B" });
    const userB = (await db.getUserByOpenId("supabase:test-b"))!;
    const a = await db.getOrCreatePersonalWorkspace(userA);
    const b = await db.getOrCreatePersonalWorkspace(userB);
    expect(b?.workspace.id).not.toBe(a?.workspace.id);
    expect(b?.membership.userId).toBe(userB.id);
    const rows = await sql`select count(*)::int as count from biem.workspace_members`;
    expect(rows[0].count).toBe(2);
  });

  it("enables row security on all application tables and denies anonymous access", async () => {
    const rows = await sql`select tablename, rowsecurity from pg_tables where schemaname='biem'`;
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.rowsecurity)).toBe(true);
    await expect(sql.begin(async (tx) => {
      await tx.unsafe("SET LOCAL ROLE anon");
      await tx.unsafe("SELECT * FROM biem.users");
    })).rejects.toMatchObject({ code: "42501" });
  });
});
