import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { attendanceRecords, services, members } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const attendanceRouter = router({
  // Listar cultos/serviços
  listServices: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const result = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.dayOfWeek);

    return result;
  }),

  // Criar novo culto/serviço
  createService: pibbAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        dayOfWeek: z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]),
        time: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(services).values({
        name: input.name,
        description: input.description || null,
        dayOfWeek: input.dayOfWeek,
        time: input.time || null,
      });

      return { success: true, serviceId: result[0].insertId };
    }),

  // Registrar frequência de um membro
  recordAttendance: pibbAdminProcedure
    .input(
      z.object({
        memberId: z.number(),
        serviceId: z.number(),
        attendanceDate: z.string(), // ISO date
        isPresent: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(attendanceRecords).values({
        memberId: input.memberId,
        serviceId: input.serviceId,
        attendanceDate: new Date(input.attendanceDate),
        isPresent: input.isPresent,
        notes: input.notes || null,
      });

      return { success: true };
    }),

  // Listar frequência de um membro
  getMemberAttendance: pibbAdminProcedure
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
          .select({
            id: attendanceRecords.id,
            memberId: attendanceRecords.memberId,
            serviceId: attendanceRecords.serviceId,
            serviceName: services.name,
            attendanceDate: attendanceRecords.attendanceDate,
            isPresent: attendanceRecords.isPresent,
            notes: attendanceRecords.notes,
            createdAt: attendanceRecords.createdAt,
          })
          .from(attendanceRecords)
          .leftJoin(services, eq(attendanceRecords.serviceId, services.id))
          .where(eq(attendanceRecords.memberId, input.memberId))
          .orderBy(desc(attendanceRecords.attendanceDate))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: attendanceRecords.id })
          .from(attendanceRecords)
          .where(eq(attendanceRecords.memberId, input.memberId)),
      ]);

      return {
        items,
        total: countResult.length,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(countResult.length / input.pageSize),
      };
    }),

  // Obter estatísticas de frequência de um membro
  getMemberAttendanceStats: pibbAdminProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const records = await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.memberId, input.memberId));

      const total = records.length;
      const present = records.filter((r) => r.isPresent).length;
      const absent = total - present;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        total,
        present,
        absent,
        attendanceRate,
      };
    }),

  // Listar frequência por culto em uma data
  getServiceAttendance: pibbAdminProcedure
    .input(
      z.object({
        serviceId: z.number(),
        attendanceDate: z.string(), // ISO date
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const records = await db
        .select({
          id: attendanceRecords.id,
          memberId: attendanceRecords.memberId,
          memberName: members.fullName,
          isPresent: attendanceRecords.isPresent,
          notes: attendanceRecords.notes,
        })
        .from(attendanceRecords)
        .leftJoin(members, eq(attendanceRecords.memberId, members.id))
        .where(
          and(
            eq(attendanceRecords.serviceId, input.serviceId),
            eq(attendanceRecords.attendanceDate, new Date(input.attendanceDate))
          )
        )
        .orderBy(members.fullName);

      return records;
    }),
});
