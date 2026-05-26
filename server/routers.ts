import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { membersRouter } from "./routers/members";
import { dashboardRouter } from "./routers/dashboard";
import { whatsappRouter } from "./routers/whatsapp";
import { adminAuthRouter } from "./routers/adminAuth";
import { historyRouter } from "./routers/history";
import { attendanceRouter } from "./routers/attendance";
import { exportRouter } from "./routers/export";
import { importRouter } from "./routers/import";
import { duplicatesRouter } from "./routers/duplicates";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  members: membersRouter,
  dashboard: dashboardRouter,
  whatsapp: whatsappRouter,
  adminAuth: adminAuthRouter,
  history: historyRouter,
  attendance: attendanceRouter,
  export: exportRouter,
  import: importRouter,
  duplicates: duplicatesRouter,
});

export type AppRouter = typeof appRouter;
