import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { members } from "../../drizzle/schema";
import { eq, or, and, ne, count, gt, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const duplicatesRouter = router({
  /**
   * Verifica se CPF ou telefone já existe (para validação em tempo real)
   */
  checkDuplicate: publicProcedure
    .input(
      z.object({
        cpf: z.string().optional(),
        phone: z.string().optional(),
        memberId: z.number().optional(), // Para edição, excluir o próprio membro
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (!input.cpf && !input.phone) {
        return { isDuplicate: false, duplicateType: null, count: 0 };
      }

      const conditions = [];

      if (input.cpf) {
        conditions.push(eq(members.cpf, input.cpf));
      }

      if (input.phone) {
        conditions.push(eq(members.phone, input.phone));
      }

      const duplicateCondition = input.memberId
        ? and(or(...conditions), ne(members.id, input.memberId))
        : or(...conditions);
      const results = await db
        .select({ id: members.id })
        .from(members)
        .where(duplicateCondition);

      if (results.length > 0) {
        const duplicateType = input.cpf ? "cpf" : "phone";
        return { isDuplicate: true, duplicateType, count: results.length };
      }

      return { isDuplicate: false, duplicateType: null, count: 0 };
    }),

  /**
   * Lista membros com dados inválidos ou incompletos
   */
  getInvalidMembers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const invalidMembers = await db
      .select({
        id: members.id,
        fullName: members.fullName,
        cpf: members.cpf,
        phone: members.phone,
        email: members.email,
        birthDate: members.birthDate,
        issues: members.id, // Placeholder, será calculado no código
      })
      .from(members)
      .where(
        or(
          // CPF inválido (menos de 11 dígitos ou todos iguais)
          eq(members.cpf, ""),
          // Telefone inválido (menos de 10 dígitos)
          eq(members.phone, ""),
          // Email inválido
          eq(members.email, "")
        )
      );

    // Processa os resultados para identificar problemas
    return invalidMembers.map((member) => {
      const issues: string[] = [];

      if (!member.cpf || member.cpf.replace(/\D/g, "").length < 11) {
        issues.push("CPF inválido ou incompleto");
      }

      if (!member.phone || member.phone.replace(/\D/g, "").length < 10) {
        issues.push("Telefone inválido ou incompleto");
      }

      if (!member.email || !member.email.includes("@")) {
        issues.push("Email inválido");
      }

      if (!member.birthDate) {
        issues.push("Data de nascimento ausente");
      }

      return {
        id: member.id,
        fullName: member.fullName,
        cpf: member.cpf,
        phone: member.phone,
        email: member.email,
        birthDate: member.birthDate,
        issues,
      };
    });
  }),

  /**
   * Encontra membros com CPF ou telefone duplicados
   */
  getDuplicateMembers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Encontra CPFs duplicados
    const duplicateCPFs = await db
      .select({
        cpf: members.cpf,
        count: count(members.id),
      })
      .from(members)
      .where(ne(members.cpf, ""))
      .groupBy(members.cpf)
      .having(gt(count(members.id), 1));

    // Encontra telefones duplicados
    const duplicatePhones = await db
      .select({
        phone: members.phone,
        count: count(members.id),
      })
      .from(members)
      .where(ne(members.phone, ""))
      .groupBy(members.phone)
      .having(gt(count(members.id), 1));

    // Busca os membros com esses CPFs/telefones duplicados
    const cpfsToFind = duplicateCPFs.map((d: any) => d.cpf);
    const phonesToFind = duplicatePhones.map((d: any) => d.phone);

    let duplicateMembers: any[] = [];

    if (cpfsToFind.length > 0) {
      const cpfMatches = await db
        .select()
        .from(members)
        .where(inArray(members.cpf, cpfsToFind));
      duplicateMembers = [...duplicateMembers, ...cpfMatches];
    }

    if (phonesToFind.length > 0) {
      const phoneMatches = await db
        .select()
        .from(members)
        .where(inArray(members.phone, phonesToFind));
      duplicateMembers = [
        ...duplicateMembers,
        ...phoneMatches.filter((m) => !duplicateMembers.find((d) => d.id === m.id)),
      ];
    }

    return duplicateMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      cpf: member.cpf,
      phone: member.phone,
      email: member.email,
      createdAt: member.createdAt,
      duplicateType: cpfsToFind.includes(member.cpf) ? "cpf" : "phone",
    }));
  }),
});
