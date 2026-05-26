import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { members, memberChildren, families } from "../../drizzle/schema";
import { eq, and, gte, lt, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = router({
  /**
   * Crescimento mensal de famílias (últimos 12 meses)
   */
  monthlyGrowth: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const months: { month: string; count: number }[] = [];
    const now = new Date();

    // Gera dados dos últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await db
        .select({ id: families.id })
        .from(families)
        .where(
          and(
            gte(families.createdAt, startDate),
            lt(families.createdAt, endDate)
          )
        );

      const monthName = startDate.toLocaleString("pt-BR", {
        month: "short",
        year: "2-digit",
      });

      months.push({
        month: monthName,
        count: count.length,
      });
    }

    return months;
  }),

  /**
   * Distribuição por ministério (inclui titular, cônjuge e filhos)
   */
  ministryDistribution: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const distribution: { [key: string]: number } = {};

    // Busca todos os membros com seu ministério
    const allMembers = await db
      .select({
        id: members.id,
        ministry: members.ministry,
        spouseMinistry: members.spouseMinistry,
      })
      .from(members);

    // Conta ministério do titular
    for (const member of allMembers) {
      const ministry = member.ministry || "Sem ministério";
      distribution[ministry] = (distribution[ministry] || 0) + 1;

      // Conta ministério do cônjuge se existir
      if (member.spouseMinistry) {
        distribution[member.spouseMinistry] = (distribution[member.spouseMinistry] || 0) + 1;
      }
    }

    // Busca todos os filhos com ministério
    const allChildren = await db
      .select({
        id: memberChildren.id,
        ministry: memberChildren.ministry,
      })
      .from(memberChildren)
      .where(isNotNull(memberChildren.ministry));

    // Conta ministério dos filhos
    for (const child of allChildren) {
      if (child.ministry) {
        distribution[child.ministry] = (distribution[child.ministry] || 0) + 1;
      }
    }

    // Converte para array e ordena por valor
    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }),

  /**
   * Estatísticas gerais de crescimento (baseado em famílias)
   */
  growthStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Total de famílias
    const totalFamilies = await db
      .select({ id: families.id })
      .from(families);

    // Novos este mês
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await db
      .select({ id: families.id })
      .from(families)
      .where(gte(families.createdAt, startOfMonth));

    // Crescimento percentual (comparado ao mês anterior)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthCount = await db
      .select({ id: families.id })
      .from(families)
      .where(
        and(
          gte(families.createdAt, startOfLastMonth),
          lt(families.createdAt, endOfLastMonth)
        )
      );

    const growthPercentage =
      lastMonthCount.length > 0
        ? ((newThisMonth.length - lastMonthCount.length) / lastMonthCount.length) * 100
        : 0;

    return {
      totalFamilies: totalFamilies.length,
      newThisMonth: newThisMonth.length,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      lastMonthCount: lastMonthCount.length,
    };
  }),

  /**
   * Distribuição por situação (Ativo, Frequentante, Visitante, Afastado)
   */
  statusDistribution: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allMembers = await db
      .select({
        id: members.id,
        memberType: members.memberType,
      })
      .from(members);

    const distribution: { [key: string]: number } = {
      "Família Ativa": 0,
      "Família Frequentante": 0,
      "Família Visitante": 0,
      "Família Afastada": 0,
    };

    for (const member of allMembers) {
      let status = "Família Ativa";
      if (member.memberType === "membro_ativo") {
        status = "Família Ativa";
      } else if (member.memberType === "frequentante") {
        status = "Família Frequentante";
      } else if (member.memberType === "visitante") {
        status = "Família Visitante";
      } else if (member.memberType === "afastado") {
        status = "Família Afastada";
      }
      if (status in distribution) {
        distribution[status]++;
      }
    }

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }),

  /**
   * Top ministérios (5 maiores, inclui titular, cônjuge e filhos)
   */
  topMinistries: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const distribution: { [key: string]: number } = {};

    // Busca todos os membros com seu ministério
    const allMembers = await db
      .select({
        id: members.id,
        ministry: members.ministry,
        spouseMinistry: members.spouseMinistry,
      })
      .from(members);

    // Conta ministério do titular
    for (const member of allMembers) {
      const ministry = member.ministry || "Sem ministério";
      distribution[ministry] = (distribution[ministry] || 0) + 1;

      // Conta ministério do cônjuge se existir
      if (member.spouseMinistry) {
        distribution[member.spouseMinistry] = (distribution[member.spouseMinistry] || 0) + 1;
      }
    }

    // Busca todos os filhos com ministério
    const allChildren = await db
      .select({
        id: memberChildren.id,
        ministry: memberChildren.ministry,
      })
      .from(memberChildren)
      .where(isNotNull(memberChildren.ministry));

    // Conta ministério dos filhos
    for (const child of allChildren) {
      if (child.ministry) {
        distribution[child.ministry] = (distribution[child.ministry] || 0) + 1;
      }
    }

    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }),
});
