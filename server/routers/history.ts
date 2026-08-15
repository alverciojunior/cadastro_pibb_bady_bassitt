import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { memberUpdates, members } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const historyRouter = router({
  // Listar histórico de alterações de um membro
  getMemberHistory: pibbAdminProcedure
    .input(
      z.object({
        memberId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.pageSize;

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(memberUpdates)
          .where(eq(memberUpdates.memberId, input.memberId))
          .orderBy(desc(memberUpdates.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: memberUpdates.id })
          .from(memberUpdates)
          .where(eq(memberUpdates.memberId, input.memberId)),
      ]);

      return {
        items,
        total: countResult.length,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(countResult.length / input.pageSize),
      };
    }),

  // Registrar uma alteração (chamado automaticamente quando membro é atualizado)
  recordChange: pibbAdminProcedure
    .input(
      z.object({
        memberId: z.number(),
        changeType: z.enum(["create", "update", "classify"]),
        changeDescription: z.string().optional(),
        fieldName: z.string().optional(),
        oldValue: z.string().optional(),
        newValue: z.string().optional(),
        updatedByUserId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(memberUpdates).values({
        memberId: input.memberId,
        changeType: input.changeType,
        changeDescription: input.changeDescription || null,
        fieldName: input.fieldName || null,
        oldValue: input.oldValue || null,
        newValue: input.newValue || null,
        updatedByUserId: input.updatedByUserId || null,
      });

      return { success: true };
    }),

  // Obter resumo de alterações recentes
  getRecentChanges: pibbAdminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const changes = await db
        .select({
          id: memberUpdates.id,
          memberId: memberUpdates.memberId,
          memberName: members.fullName,
          changeType: memberUpdates.changeType,
          changeDescription: memberUpdates.changeDescription,
          fieldName: memberUpdates.fieldName,
          oldValue: memberUpdates.oldValue,
          newValue: memberUpdates.newValue,
          createdAt: memberUpdates.createdAt,
        })
        .from(memberUpdates)
        .leftJoin(members, eq(memberUpdates.memberId, members.id))
        .orderBy(desc(memberUpdates.createdAt))
        .limit(input.limit);

      return changes;
    }),
});
