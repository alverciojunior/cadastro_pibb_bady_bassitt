import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyAdminToken } from "../routers/adminAuth";

export type AdminSession = { id: number; username: string };

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  admin: AdminSession | null;
};

const ADMIN_COOKIE = "pibb_admin_session";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let admin: AdminSession | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // Verificar sessão do admin próprio (cookie pibb_admin_session)
  try {
    const adminToken = opts.req.cookies?.[ADMIN_COOKIE];
    if (adminToken) {
      const payload = await verifyAdminToken(adminToken);
      if (payload) {
        admin = { id: payload.adminId, username: payload.username };
      }
    }
  } catch {
    admin = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    admin,
  };
}
