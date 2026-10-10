import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT } from "jose";

const db = vi.hoisted(() => ({
  getDb: vi.fn(), upsertUser: vi.fn(), getUserByOpenId: vi.fn(), getOrCreatePersonalWorkspace: vi.fn(),
}));
vi.mock("../server/db", () => db);

describe("Supabase account authentication", () => {
  let server: Server;
  let origin: string;
  const nativeFetch = globalThis.fetch;
  const provider = vi.fn();
  const email = "owner@example.com";

  beforeAll(async () => {
    vi.stubEnv("AUTH_PROVIDER", "supabase");
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://app.example.com");
    vi.stubEnv("SUPABASE_URL", "https://project.example.com");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubEnv("DATABASE_URL", "test-database-binding");
    vi.stubEnv("JWT_SECRET", "test-session-secret-at-least-32-bytes");
    vi.stubGlobal("fetch", (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      String(input).startsWith("https://project.example.com/") ? provider(input, init) : nativeFetch(input, init));
    const { createApp } = await import("../server/_core/app");
    server = createServer(createApp());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    db.getDb.mockResolvedValue({});
    db.getUserByOpenId.mockResolvedValue({ id: 1, openId: "supabase:user-1", name: email, email });
    db.getOrCreatePersonalWorkspace.mockResolvedValue({ workspace: { id: "workspace-1" }, membership: { status: "active" } });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });

  const post = (action: string, body: unknown) => fetch(`${origin}/api/auth/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://app.example.com" }, body: JSON.stringify(body),
  });

  it("rejects malformed credentials without contacting the provider", async () => {
    expect((await post("login", { email: "invalid", password: "short" })).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });

  it("denies incorrect passwords without setting a session", async () => {
    provider.mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    const response = await post("login", { email, password: "wrong-password" });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).not.toContain("webdev_app_session=");
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

  it("requires email confirmation without opening a workspace", async () => {
    provider.mockResolvedValueOnce(Response.json({ user: { id: "user-1" } }));
    const response = await post("signup", { email, password: "test-password" });
    expect(await response.json()).toEqual({ confirmationRequired: true });
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

  it("verifies provider identity and provisions the workspace before issuing a cookie", async () => {
    provider.mockResolvedValueOnce(Response.json({ access_token: "provider-token" }));
    provider.mockResolvedValueOnce(Response.json({ id: "user-1", email, email_confirmed_at: "2026-10-10" }));
    const response = await post("login", { email, password: "test-password" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(provider).toHaveBeenLastCalledWith("https://project.example.com/auth/v1/user", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer provider-token" }) }));
    expect(db.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "supabase:user-1", role: "user" }));
    expect(db.getOrCreatePersonalWorkspace).toHaveBeenCalled();
    const token = /webdev_app_session=([^;]+)/.exec(cookie)![1];
    const { sdk } = await import("../server/_core/sdk");
    expect(await sdk.verifySession(decodeURIComponent(token))).toMatchObject({ openId: "supabase:user-1", appId: "biem-supabase" });
  });

  it("does not trust an unverified provider identity", async () => {
    provider.mockResolvedValueOnce(Response.json({ access_token: "forged-token" }));
    provider.mockResolvedValueOnce(Response.json({ error: "invalid_token" }, { status: 401 }));
    const response = await post("login", { email, password: "test-password" });
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).not.toContain("webdev_app_session=");
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

  it("denies login when the email is not confirmed", async () => {
    provider.mockResolvedValueOnce(Response.json({ access_token: "provider-token" }));
    provider.mockResolvedValueOnce(Response.json({ id: "user-1", email, email_confirmed_at: null }));
    const response = await post("login", { email, password: "test-password" });
    expect(response.status).toBe(503);
    expect(db.upsertUser).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).not.toContain("webdev_app_session=");
  });

  it("does not issue a session when workspace provisioning fails", async () => {
    provider.mockResolvedValueOnce(Response.json({ access_token: "provider-token" }));
    provider.mockResolvedValueOnce(Response.json({ id: "user-1", email, email_confirmed_at: "2026-10-10" }));
    db.getOrCreatePersonalWorkspace.mockResolvedValueOnce(null);
    const response = await post("login", { email, password: "test-password" });
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).not.toContain("webdev_app_session=");
  });

  it("reports missing configuration without sending credentials", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    try {
      const response = await post("login", { email, password: "test-password" });
      expect(response.status).toBe(503);
      expect(provider).not.toHaveBeenCalled();
    } finally { vi.stubEnv("SUPABASE_URL", "https://project.example.com"); }
  });

  it("accepts the public variable names provided by the Supabase tutorial", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-alias-key");
    try {
      provider.mockResolvedValueOnce(Response.json({ user: { id: "user-1" } }));
      const response = await post("signup", { email, password: "test-password" });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ confirmationRequired: true });
      expect(provider).toHaveBeenCalledWith("https://project.example.com/auth/v1/signup", expect.objectContaining({ headers: expect.objectContaining({ apikey: "test-public-alias-key" }) }));
    } finally {
      vi.stubEnv("SUPABASE_URL", "https://project.example.com");
      vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    }
  });

  it("rejects cookies signed for another application", async () => {
    const token = await new SignJWT({ openId: "supabase:user-1", appId: "another-app", name: email })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const { sdk } = await import("../server/_core/sdk");
    expect(await sdk.verifySession(token)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const token = await new SignJWT({ openId: "supabase:user-1", appId: "biem-supabase", name: email })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const { sdk } = await import("../server/_core/sdk");
    expect(await sdk.verifySession(token)).toBeNull();
  });
});
