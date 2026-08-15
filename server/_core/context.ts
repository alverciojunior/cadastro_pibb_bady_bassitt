import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminTokenFromRequest, verifyAdminToken } from "../routers/adminAuth";

export type AdminSession = { id: number; username: string };

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  admin: AdminSession | null;
};

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

  // Verificar sessão do admin próprio via cookie ou header Authorization.
  try {
    const adminToken = getAdminTokenFromRequest(opts.req);
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
