import { parse as parseCookieHeader } from "cookie";
import type { CookieOptions, Request, RequestHandler } from "express";

import { LEGACY_COOKIE_NAME } from "../../shared/const.js";

export const WEB_SESSION_COOKIE_NAME = "webdev_app_session";
const OAUTH_STATE_COOKIE_NAME = "biem_oauth_state";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: Request): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Preview is cross-site HTTPS. Production can safely preserve this stricter eligible setting.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

function configuredApiHostname(): string | null {
  const packager = process.env.EXPO_PACKAGER_PROXY_URL;
  if (!packager) return null;
  try {
    const url = new URL(packager);
    const hostname = url.hostname.replace(/^8081-/, "3000-");
    return hostname === url.hostname ? null : hostname;
  } catch {
    return null;
  }
}

function legacyParentDomain(hostname: string): string | null {
  const normalized = hostname.toLowerCase();
  if (normalized !== configuredApiHostname()?.toLowerCase()) return null;
  if (!/^3000-[a-z0-9-]+(?:\.[a-z0-9-]+){2,}$/.test(normalized)) return null;
  return `.${normalized.split(".").slice(-2).join(".")}`;
}

export function getSessionCookieName(_req: Request): string {
  // Preview auto-login requires this exact application-owned cookie name.
  return WEB_SESSION_COOKIE_NAME;
}

export function getOAuthStateCookieName(): string {
  return OAUTH_STATE_COOKIE_NAME;
}

export function getLegacySessionCookieOptions(req: Request): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    domain: legacyParentDomain(req.hostname) ?? undefined,
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

export function clearLegacySessionCookie(): RequestHandler {
  return (req, res, next) => {
    res.clearCookie(LEGACY_COOKIE_NAME, getLegacySessionCookieOptions(req));
    next();
  };
}

function cookieValue(req: Request, name: string): string | undefined {
  if (!req.headers.cookie) return undefined;
  return parseCookieHeader(req.headers.cookie)[name];
}

export function currentSessionCookie(req: Request): string | undefined {
  return cookieValue(req, getSessionCookieName(req));
}

export function currentOAuthStateCookie(req: Request): string | undefined {
  return cookieValue(req, getOAuthStateCookieName());
}
