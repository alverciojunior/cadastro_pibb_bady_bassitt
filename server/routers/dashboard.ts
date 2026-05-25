import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, families, memberChildren } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, like, or } from "drizzle-orm";

export const dashboardRouter = router({
  // KPIs principais
  kpis: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalMembers,
      byType,
      totalFamilies,
      totalBaptized,
      birthdaysThisMonth,
      newThisMonth,
      newLastMonth,
      duplicates,
    ] = await Promise.all([
      // Total membros ativos
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(eq(members.isActive, true)),

      // Por tipo
      db
        .select({
          memberType: members.memberType,
          count: sql<number>`count(*)`,
        })
        .from(members)
        .where(eq(members.isActive, true))
        .groupBy(members.memberType),

      // Total famílias
      db.select({ count: sql<number>`count(*)` }).from(families),

      // Batizados
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(eq(members.isActive, true), eq(members.isBaptized, true))),

      // Aniversariantes do mês
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`MONTH(${members.birthDate}) = ${thisMonth}`
          )
        ),

      // Novos este mês
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`YEAR(${members.createdAt}) = ${thisYear}`,
            sql`MONTH(${members.createdAt}) = ${thisMonth}`
          )
        ),

      // Novos mês passado
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`YEAR(${members.createdAt}) = ${lastMonth.getFullYear()}`,
            sql`MONTH(${members.createdAt}) = ${lastMonth.getMonth() + 1}`
          )
        ),

      // Duplicidades
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(eq(members.isActive, true), eq(members.hasDuplicate, true))),
    ]);

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      if (row.memberType) typeMap[row.memberType] = Number(row.count);
    }

    const total = Number(totalMembers[0]?.count ?? 0);
    const newThisMonthCount = Number(newThisMonth[0]?.count ?? 0);
    const newLastMonthCount = Number(newLastMonth[0]?.count ?? 0);
    const growthRate =
      newLastMonthCount > 0
        ? Math.round(((newThisMonthCount - newLastMonthCount) / newLastMonthCount) * 100)
        : 0;

    return {
      totalMembers: total,
      membrosAtivos: typeMap["membro_ativo"] ?? 0,
      frequentantes: typeMap["frequentante"] ?? 0,
      visitantes: typeMap["visitante"] ?? 0,
      afastados: typeMap["afastado"] ?? 0,
      totalFamilies: Number(totalFamilies[0]?.count ?? 0),
      totalBaptized: Number(totalBaptized[0]?.count ?? 0),
      birthdaysThisMonth: Number(birthdaysThisMonth[0]?.count ?? 0),
      newThisMonth: newThisMonthCount,
      growthRate,
      duplicates: Number(duplicates[0]?.count ?? 0),
    };
  }),

  // Distribuição por congregação
  byCongregation: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        congregation: members.congregation,
        count: sql<number>`count(*)`,
      })
      .from(members)
      .where(and(eq(members.isActive, true), sql`${members.congregation} IS NOT NULL`))
      .groupBy(members.congregation)
      .orderBy(sql`count(*) DESC`);

    return result.map((r) => ({
      name: r.congregation || "Não informado",
      value: Number(r.count),
    }));
  }),

  // Distribuição por ministério
  byMinistry: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        ministry: members.ministry,
        count: sql<number>`count(*)`,
      })
      .from(members)
      .where(and(eq(members.isActive, true), sql`${members.ministry} IS NOT NULL`))
      .groupBy(members.ministry)
      .orderBy(sql`count(*) DESC`);

    return result.map((r) => ({
      name: r.ministry || "Não informado",
      value: Number(r.count),
    }));
  }),

  // Faixa etária
  byAgeGroup: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Busca birthDate de todos os membros ativos com data de nascimento
    // e agrupa no lado do servidor para evitar incompatibilidades SQL
    const rows = await db
      .select({ birthDate: members.birthDate })
      .from(members)
      .where(and(eq(members.isActive, true), sql`${members.birthDate} IS NOT NULL`));

    const ORDER = [
      'Criança (0-11)',
      'Adolescente (12-17)',
      'Jovem (18-29)',
      'Adulto (30-44)',
      'Adulto (45-59)',
      'Idoso (60+)',
    ];

    const counts: Record<string, number> = {};
    const now = new Date();
    for (const row of rows) {
      if (!row.birthDate) continue;
      const birth = new Date(row.birthDate);
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      let label: string;
      if (age < 12) label = 'Criança (0-11)';
      else if (age < 18) label = 'Adolescente (12-17)';
      else if (age < 30) label = 'Jovem (18-29)';
      else if (age < 45) label = 'Adulto (30-44)';
      else if (age < 60) label = 'Adulto (45-59)';
      else label = 'Idoso (60+)';
      counts[label] = (counts[label] ?? 0) + 1;
    }

    return ORDER.filter((o) => counts[o]).map((name) => ({
      name,
      value: counts[name],
    }));
  }),

  // Crescimento mensal (últimos 12 meses)
  monthlyGrowth: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Busca createdAt e agrupa por mês no servidor para evitar incompatibilidades SQL
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);

    const rows = await db
      .select({ createdAt: members.createdAt })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`${members.createdAt} >= ${cutoff.toISOString().slice(0, 10)}`
        )
      );

    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (!row.createdAt) continue;
      const d = new Date(row.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }),

  // Aniversariantes do mês atual
  birthdaysThisMonth: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const thisMonth = now.getMonth() + 1;

    const result = await db
      .select({
        id: members.id,
        fullName: members.fullName,
        birthDate: members.birthDate,
        phone: members.phone,
        whatsapp: members.whatsapp,
      })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.birthDate}) = ${thisMonth}`
        )
      )
      .orderBy(sql`DAY(${members.birthDate})`);

    return result;
  }),

  // Membros com duplicidade
  duplicates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: members.id,
        fullName: members.fullName,
        cpf: members.cpf,
        phone: members.phone,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(and(eq(members.isActive, true), eq(members.hasDuplicate, true)))
      .orderBy(members.fullName);
  }),
});
