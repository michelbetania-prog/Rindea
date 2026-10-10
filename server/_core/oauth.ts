import { randomUUID } from "node:crypto";
import { ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";

import { getUserByOpenId, upsertUser } from "../db";
import {
  currentOAuthStateCookie,
  getOAuthStateCookieName,
  getSessionCookieName,
  getSessionCookieOptions,
} from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type OAuthState = { redirectUri: string; nonce: string };

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function encodeState(value: OAuthState) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function decodeState(value: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as Partial<OAuthState>;
    if (typeof parsed.redirectUri !== "string" || typeof parsed.nonce !== "string") return null;
    return parsed as OAuthState;
  } catch {
    return null;
  }
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value?.split(",")[0]?.trim();
}

function requestOrigin(req: Request) {
  const protocol = firstHeader(req.headers["x-forwarded-proto"]) || req.protocol;
  const host = firstHeader(req.headers["x-forwarded-host"]) || req.get("host");
  if (!host) throw new Error("Missing request host");
  return `${protocol}://${host}`;
}

function frontendOrigin() {
  return process.env.APP_PUBLIC_ORIGIN || process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
}

function apiOrigin(req: Request) {
  return process.env.API_PUBLIC_ORIGIN || requestOrigin(req);
}

function buildLoginUrl(redirectUri: string, state: string) {
  if (!ENV.oAuthPortalUrl || !ENV.appId) throw new Error("OAuth portal configuration is unavailable");
  const url = new URL(`${ENV.oAuthPortalUrl}/app-auth`);
  url.searchParams.set("appId", ENV.appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");
  url.searchParams.set("type", "signIn");
  return url.toString();
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) throw new Error("openId missing from user info");
  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? { openId: userInfo.openId, name: userInfo.name, email: userInfo.email, loginMethod: userInfo.loginMethod ?? null, lastSignedIn };
}

function buildUserResponse(user: Awaited<ReturnType<typeof getUserByOpenId>> | { openId: string; name?: string | null; email?: string | null; loginMethod?: string | null; lastSignedIn?: Date | null }) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  /** Web-only OAuth entrypoint. It binds a short-lived nonce to the browser before redirecting. */
  app.get("/api/oauth/start", (req, res) => {
    try {
      const nonce = randomUUID();
      const redirectUri = `${apiOrigin(req)}/api/oauth/callback`;
      const state = encodeState({ redirectUri, nonce });
      res.cookie(getOAuthStateCookieName(), nonce, { ...getSessionCookieOptions(req), maxAge: OAUTH_STATE_TTL_MS });
      res.redirect(302, buildLoginUrl(redirectUri, state));
    } catch {
      res.status(500).json({ error: "Unable to start sign in" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookieOptions = getSessionCookieOptions(req);

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const parsedState = decodeState(state);
    const cookieNonce = currentOAuthStateCookie(req);
    res.clearCookie(getOAuthStateCookieName(), { ...cookieOptions, maxAge: -1 });
    if (!parsedState || !cookieNonce || parsedState.nonce !== cookieNonce) {
      res.status(400).json({ error: "Invalid OAuth state" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
      res.cookie(getSessionCookieName(req), sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      // Fixed configured origin only; never redirect to a URL supplied by the browser.
      res.redirect(302, frontendOrigin());
    } catch {
      console.error("[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
      res.cookie(getSessionCookieName(req), sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[OAuth] Mobile exchange failed");
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(getSessionCookieName(req), { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      res.cookie(getSessionCookieName(req), token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
