import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

describe("Vercel Express API handler", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://app.example.com");
    const { default: handler } = await import("../api/index");
    server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.unstubAllEnvs();
  });

  it("serves the API health route as JSON", async () => {
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it("serves tRPC without granting an anonymous session", async () => {
    const response = await fetch(`${origin}/api/trpc/auth.me`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { data: { json: null } } });
  });

  it("routes the OAuth callback and rejects missing parameters", async () => {
    const response = await fetch(`${origin}/api/oauth/callback`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "code and state are required" });
  });

  it("routes OAuth start and binds the redirect to a nonce cookie", async () => {
    const { ENV } = await import("../server/_core/env");
    const saved = { oAuthPortalUrl: ENV.oAuthPortalUrl, appId: ENV.appId };
    try {
      ENV.oAuthPortalUrl = "https://identity.example.com";
      ENV.appId = "test-app";
      const response = await fetch(`${origin}/api/oauth/start`, { redirect: "manual" });
      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://identity.example.com");
      expect(location.searchParams.get("appId")).toBe("test-app");
      expect(location.searchParams.get("redirectUri")).toBe(`${origin}/api/oauth/callback`);
      expect(response.headers.get("set-cookie")).toContain("HttpOnly");
      expect(location.searchParams.get("state")).toBeTruthy();
    } finally {
      Object.assign(ENV, saved);
    }
  });

  it("allows the configured production origin for logout", async () => {
    const response = await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: "https://app.example.com" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(await response.json()).toEqual({ success: true });
  });

  it("rejects requests from an untrusted origin", async () => {
    const response = await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: "https://other.example.com" },
    });
    expect(response.status).toBe(403);
  });
});
