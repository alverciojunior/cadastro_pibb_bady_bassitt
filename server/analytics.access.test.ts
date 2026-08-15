import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: null,
    admin: { id: 1, username: "admin" },
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("analytics access", () => {
  it.skipIf(!process.env.DATABASE_URL)("allows the PIBB administrative session to load analytics", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.analytics.growthStats();

    expect(stats).toMatchObject({
      totalFamilies: expect.any(Number),
      newThisMonth: expect.any(Number),
      growthPercentage: expect.any(Number),
      lastMonthCount: expect.any(Number),
    });
  });
});
