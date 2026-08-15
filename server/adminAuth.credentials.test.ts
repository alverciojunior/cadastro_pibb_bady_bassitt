import { describe, expect, it } from "vitest";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(authorization?: string): TrpcContext {
  return {
    user: null,
    admin: null,
    req: {
      headers: authorization ? { authorization } : {},
      cookies: {},
      protocol: "https",
    } as TrpcContext["req"],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("adminAuth credentials", () => {
  it.skipIf(!process.env.DATABASE_URL)("keeps the documented default admin credentials valid", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const rows = await db!
      .select({
        username: adminUsers.username,
        passwordHash: adminUsers.passwordHash,
        isActive: adminUsers.isActive,
      })
      .from(adminUsers)
      .where(eq(adminUsers.username, "admin"))
      .limit(1);

    const admin = rows[0];
    expect(admin).toBeDefined();
    expect(admin?.isActive).toBe(true);
    expect(await bcrypt.compare("pibb2024", admin!.passwordHash)).toBe(true);
    expect(await bcrypt.compare("admin", admin!.passwordHash)).toBe(false);
  });

  it.skipIf(!process.env.DATABASE_URL)("authorizes the dashboard session through the login token fallback", async () => {
    const loginCaller = appRouter.createCaller(createAdminContext());
    const login = await loginCaller.adminAuth.login({
      username: "admin",
      password: "pibb2024",
    });

    expect(login.token).toBeTruthy();

    const sessionCaller = appRouter.createCaller(
      createAdminContext(`Bearer ${login.token}`)
    );
    const session = await sessionCaller.adminAuth.me();

    expect(session).toMatchObject({ username: "admin", name: "Administrador" });
  });
});
