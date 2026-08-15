import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, attendanceRecords, services } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const exportRouter = router({
  // Exportar membros como JSON (para Excel)
  getMembersForExport: pibbAdminProcedure
    .input(
      z.object({
        filter: z.enum(["todos", "ativos", "inativos"]).default("todos"),
        memberType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result =
        input.filter === "ativos"
          ? await db.select().from(members).where(eq(members.isActive, true))
          : input.filter === "inativos"
            ? await db.select().from(members).where(eq(members.isActive, false))
            : await db.select().from(members);

      // Formatar dados para exportação
      return result.map((m) => ({
        "Nome Completo": m.fullName,
        "Data de Nascimento": m.birthDate ? new Date(m.birthDate).toLocaleDateString("pt-BR") : "",
        "Gênero": m.gender || "",
        "Estado Civil": m.maritalStatus || "",
        "CPF": m.cpf || "",
        "Telefone": m.phone || "",
        "WhatsApp": m.whatsapp || "",
        "Email": m.email || "",
        "Rua": m.street || "",
        "Número": m.number || "",
        "Complemento": m.complement || "",
        "Bairro": m.neighborhood || "",
        "Cidade": m.city || "",
        "Estado": m.state || "",
        "CEP": m.zipCode || "",
        "Congregação": m.congregation || "",
        "Ministério": m.ministry || "",
        "Batizado": m.isBaptized ? "Sim" : "Não",
        "Data do Batismo": m.baptismDate ? new Date(m.baptismDate).toLocaleDateString("pt-BR") : "",
        "Dizimista": m.isTither || "",
        "Frequência": m.attendanceFrequency || "",
        "Área de Serviço": m.serviceArea || "",
        "Dons": m.gifts || "",
        "Nome do Cônjuge": m.spouseName || "",
        "Tipo de Membro": m.memberType || "",
        "Ativo": m.isActive ? "Sim" : "Não",
      }));
    }),

  // Exportar frequência como JSON (para Excel)
  getAttendanceForExport: pibbAdminProcedure
    .input(
      z.object({
        serviceId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let baseQuery = db
        .select({
          memberName: members.fullName,
          serviceName: services.name,
          attendanceDate: attendanceRecords.attendanceDate,
          isPresent: attendanceRecords.isPresent,
          notes: attendanceRecords.notes,
        })
        .from(attendanceRecords)
        .leftJoin(members, eq(attendanceRecords.memberId, members.id))
        .leftJoin(services, eq(attendanceRecords.serviceId, services.id));

      const result = input.serviceId
        ? await baseQuery.where(eq(attendanceRecords.serviceId, input.serviceId))
        : await baseQuery;

      return result.map((r: any) => ({
        "Membro": r.memberName || "",
        "Culto": r.serviceName || "",
        "Data": r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString("pt-BR") : "",
        "Presença": r.isPresent ? "Presente" : "Ausente",
        "Observações": r.notes || "",
      }));
    }),

  // Gerar CSV para download
  generateMembersCSV: pibbAdminProcedure
    .input(
      z.object({
        filter: z.enum(["todos", "ativos", "inativos"]).default("todos"),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result =
        input.filter === "ativos"
          ? await db.select().from(members).where(eq(members.isActive, true))
          : input.filter === "inativos"
            ? await db.select().from(members).where(eq(members.isActive, false))
            : await db.select().from(members);

      // Criar CSV
      const headers = [
        "Nome Completo",
        "Data de Nascimento",
        "Gênero",
        "Estado Civil",
        "CPF",
        "Telefone",
        "WhatsApp",
        "Email",
        "Rua",
        "Número",
        "Complemento",
        "Bairro",
        "Cidade",
        "Estado",
        "CEP",
        "Congregação",
        "Ministério",
        "Batizado",
        "Data do Batismo",
        "Dizimista",
        "Frequência",
        "Tipo de Membro",
      ];

      const rows = result.map((m) => [
        m.fullName,
        m.birthDate ? new Date(m.birthDate).toLocaleDateString("pt-BR") : "",
        m.gender || "",
        m.maritalStatus || "",
        m.cpf || "",
        m.phone || "",
        m.whatsapp || "",
        m.email || "",
        m.street || "",
        m.number || "",
        m.complement || "",
        m.neighborhood || "",
        m.city || "",
        m.state || "",
        m.zipCode || "",
        m.congregation || "",
        m.ministry || "",
        m.isBaptized ? "Sim" : "Não",
        m.baptismDate ? new Date(m.baptismDate).toLocaleDateString("pt-BR") : "",
        m.isTither || "",
        m.attendanceFrequency || "",
        m.memberType || "",
      ]);

      const csv = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(",")),
      ].join("\n");

      return {
        csv,
        filename: `membros-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),

  // Gerar CSV de frequência para download
  generateAttendanceCSV: pibbAdminProcedure
    .input(
      z.object({
        serviceId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let baseQuery = db
        .select({
          memberName: members.fullName,
          serviceName: services.name,
          attendanceDate: attendanceRecords.attendanceDate,
          isPresent: attendanceRecords.isPresent,
          notes: attendanceRecords.notes,
        })
        .from(attendanceRecords)
        .leftJoin(members, eq(attendanceRecords.memberId, members.id))
        .leftJoin(services, eq(attendanceRecords.serviceId, services.id));

      const result = input.serviceId
        ? await baseQuery.where(eq(attendanceRecords.serviceId, input.serviceId))
        : await baseQuery;

      const headers = ["Membro", "Culto", "Data", "Presença", "Observações"];

      const rows = result.map((r: (typeof result)[number]) => [
        r.memberName || "",
        r.serviceName || "",
        r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString("pt-BR") : "",
        r.isPresent ? "Presente" : "Ausente",
        r.notes || "",
      ]);

      const csv = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(",")),
      ].join("\n");

      return {
        csv,
        filename: `frequencia-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),
});
