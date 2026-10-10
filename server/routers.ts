import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, workspaceProcedure } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /** Public only to let the app decide whether to render its login gate. */
    me: publicProcedure.query(({ ctx }) => ctx.user ? ({ user: ctx.user, workspace: ctx.workspace, membership: ctx.membership }) : null),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspaces: router({
    current: workspaceProcedure.query(({ ctx }) => ({ workspace: ctx.workspace, membership: ctx.membership })),
  }),
});

export type AppRouter = typeof appRouter;
