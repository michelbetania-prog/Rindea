import type { Express, Request, Response } from "express";
import { z } from "zod";
import { getDb, getUserByOpenId, getOrCreatePersonalWorkspace, upsertUser } from "../db";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getSessionCookieName, getSessionCookieOptions } from "./cookies";

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
const SESSION_MS = 60 * 60 * 1000;

function settings() {
  const configuredUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = new URL(configuredUrl || "https://not-configured.invalid");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!configuredUrl || url.protocol !== "https:" || !key || !process.env.DATABASE_URL || new TextEncoder().encode(ENV.cookieSecret).length < 32) {
    throw new Error("Account services are not configured");
  }
  return { url: url.origin, key };
}

async function supabase(path: string, body: unknown, accessToken?: string) {
  const config = settings();
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method: accessToken ? "GET" : "POST",
    headers: { apikey: config.key, "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(accessToken ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return { response, data };
}

async function establishSession(accessToken: string, req: Request, res: Response) {
  // Independently verify the provider-issued token. Never trust a submitted user ID.
  const { response, data: identity } = await supabase("user", null, accessToken);
  if (!response.ok || typeof identity.id !== "string" || typeof identity.email !== "string" || !identity.email_confirmed_at) throw new Error("Invalid provider identity");
  if (!await getDb()) throw new Error("Database is unavailable");
  const openId = `supabase:${identity.id}`;
  await upsertUser({ openId, email: identity.email, name: identity.email, loginMethod: "supabase", lastSignedIn: new Date(), role: "user" });
  const user = await getUserByOpenId(openId);
  if (!user || !await getOrCreatePersonalWorkspace(user)) throw new Error("Workspace is unavailable");
  const token = await sdk.createSessionToken(openId, { name: user.name || identity.email, expiresInMs: SESSION_MS });
  res.cookie(getSessionCookieName(req), token, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: SESSION_MS });
}

export function registerAccountRoutes(app: Express) {
  app.get("/api/auth/me", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: { id: user.id, openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn } });
    } catch { res.status(401).json({ user: null, error: "Not authenticated" }); }
  });
  app.post("/api/auth/:action(login|signup)", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Introduce un correo válido y una contraseña de entre 8 y 128 caracteres." }); return; }
    try { settings(); } catch { res.status(503).json({ error: "El acceso con cuentas aún no está configurado. Falta conectar Supabase Auth y PostgreSQL." }); return; }
    try {
      const signup = req.params.action === "signup";
      const path = signup ? "signup" : "token?grant_type=password";
      const { response, data } = await supabase(path, parsed.data);
      if (!response.ok) {
        res.status(response.status === 429 ? 429 : 401).json({ error: response.status === 429 ? "Demasiados intentos. Espera unos minutos." : "No se pudo completar el acceso. Revisa tu correo, contraseña y confirmación de cuenta." }); return;
      }
      if (typeof data.access_token !== "string") {
        if (signup) { res.json({ confirmationRequired: true }); return; }
        throw new Error("Missing provider session");
      }
      await establishSession(data.access_token, req, res);
      res.json({ success: true });
    } catch {
      res.status(503).json({ error: "No pudimos abrir tu cuenta. Revisa la configuración de autenticación y base de datos." });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(getSessionCookieName(req), { ...getSessionCookieOptions(req), sameSite: "lax" });
    res.json({ success: true });
  });
}
