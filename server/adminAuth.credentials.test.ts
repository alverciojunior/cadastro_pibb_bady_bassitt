import { describe, expect, it } from "vitest";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers } from "../drizzle/schema";

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
});

