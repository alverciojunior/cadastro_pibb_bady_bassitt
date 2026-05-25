import { z } from "zod";
import { router, publicProcedure, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { adminUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as jose from "jose";
import { ENV } from "../_core/env";

const ADMIN_COOKIE = "pibb_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

function isSecureRequest(req: any): boolean {
  if (req.protocol === "https") return true;
  const fwd = req.headers["x-forwarded-proto"];
  if (!fwd) return false;
  const list = Array.isArray(fwd) ? fwd : fwd.split(",");
  return list.some((p: string) => p.trim().toLowerCase() === "https");
}

function getAdminCookieOptions(req: any) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    secure,
    // sameSite=none requer secure=true; em HTTP local usa lax
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

async function signAdminToken(adminId: number, username: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret + "_admin");
  return new jose.SignJWT({ adminId, username, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<{ adminId: number; username: string } | null> {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret + "_admin");
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.type !== "admin") return null;
    return { adminId: payload.adminId as number, username: payload.username as string };
  } catch {
    return null;
  }
}

export const adminAuthRouter = router({
  // Login com username + senha
  login: publicProcedure
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const rows = await db.select().from(adminUsers).where(eq(adminUsers.username, input.username.trim().toLowerCase())).limit(1);
      const admin = rows[0];

      if (!admin || !admin.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
      }

      const passwordOk = await bcrypt.compare(input.password, admin.passwordHash);
      if (!passwordOk) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
      }

      // Atualizar lastLoginAt
      await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));

      const token = await signAdminToken(admin.id, admin.username);
      const cookieOptions = getAdminCookieOptions(ctx.req);
      ctx.res.cookie(ADMIN_COOKIE, token, cookieOptions);

      return { success: true, name: admin.name, username: admin.username };
    }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getAdminCookieOptions(ctx.req);
    ctx.res.clearCookie(ADMIN_COOKIE, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // Verificar sessão atual
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[ADMIN_COOKIE];
    if (!token) return null;

    const payload = await verifyAdminToken(token);
    if (!payload) return null;

    const db = await getDb();
    if (!db) return null;

    const rows = await db.select({ id: adminUsers.id, username: adminUsers.username, name: adminUsers.name, isActive: adminUsers.isActive })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.adminId))
      .limit(1);

    const admin = rows[0];
    if (!admin || !admin.isActive) return null;

    return { id: admin.id, username: admin.username, name: admin.name };
  }),

  // Alterar senha (admin logado)
  changePassword: publicProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6, "Mínimo 6 caracteres") }))
    .mutation(async ({ input, ctx }) => {
      const token = ctx.req.cookies?.[ADMIN_COOKIE];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });

      const payload = await verifyAdminToken(token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.adminId)).limit(1);
      const admin = rows[0];
      if (!admin) throw new TRPCError({ code: "NOT_FOUND" });

      const ok = await bcrypt.compare(input.currentPassword, admin.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.update(adminUsers).set({ passwordHash: newHash }).where(eq(adminUsers.id, admin.id));

      return { success: true };
    }),

  // Listar todos os admins (requer sessão admin)
  listAdmins: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      id: adminUsers.id,
      username: adminUsers.username,
      name: adminUsers.name,
      isActive: adminUsers.isActive,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    }).from(adminUsers);
    return rows;
  }),

  // Criar novo admin
  createAdmin: pibbAdminProcedure
    .input(z.object({
      username: z.string().min(3, "Mínimo 3 caracteres").max(32),
      name: z.string().min(2, "Mínimo 2 caracteres"),
      password: z.string().min(6, "Mínimo 6 caracteres"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.username, input.username.trim().toLowerCase()))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Nome de usuário já existe" });
      }

      const hash = await bcrypt.hash(input.password, 12);
      await db.insert(adminUsers).values({
        username: input.username.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: hash,
        isActive: true,
      });
      return { success: true };
    }),

  // Trocar senha de qualquer admin (pelo admin logado)
  resetPassword: pibbAdminProcedure
    .input(z.object({
      adminId: z.number(),
      newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const hash = await bcrypt.hash(input.newPassword, 12);
      await db.update(adminUsers).set({ passwordHash: hash }).where(eq(adminUsers.id, input.adminId));
      return { success: true };
    }),

  // Ativar/desativar admin
  toggleActive: pibbAdminProcedure
    .input(z.object({ adminId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // Não permite desativar a si mesmo
      if (ctx.admin.id === input.adminId && !input.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desativar sua própria conta" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(adminUsers).set({ isActive: input.isActive }).where(eq(adminUsers.id, input.adminId));
      return { success: true };
    }),
});
