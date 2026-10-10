import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import type { User, Workspace, WorkspaceMember } from "../../drizzle/schema";
import { getOrCreatePersonalWorkspace } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let workspace: Workspace | null = null;
  let membership: WorkspaceMember | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Public procedures may resolve without a session. Protected procedures reject them.
    user = null;
  }

  if (user) {
    try {
    const access = await getOrCreatePersonalWorkspace(user);
    workspace = access?.workspace ?? null;
    membership = access?.membership ?? null;
    } catch {
      // Keep the identity so the client can distinguish provisioning trouble from sign-out.
      workspace = null;
      membership = null;
    }
  }

  return { req: opts.req, res: opts.res, user, workspace, membership };
}
