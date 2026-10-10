import { describe, expect, it } from "vitest";

import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

const user: NonNullable<TrpcContext["user"]> = {
  id: 1,
  openId: "user-a",
  name: "Ana",
  email: "ana@example.com",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(overrides: Partial<TrpcContext>): TrpcContext {
  return {
    user: null,
    workspace: null,
    membership: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    ...overrides,
  };
}

describe("workspaceProcedure", () => {
  it("rejects a request without an authenticated account", async () => {
    const caller = appRouter.createCaller(context({ user: null }));
    await expect(caller.workspaces.current()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an account without an active workspace membership", async () => {
    const caller = appRouter.createCaller(context({ user, workspace: null, membership: null }));
    await expect(caller.workspaces.current()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
