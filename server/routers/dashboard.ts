import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, families, memberChildren } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, like, or } from "drizzle-orm";

export const dashboardRouter = router({
  // KPIs principais
  kpis: pibbAdminProcedure.query(async () => {
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
      totalBaptizedMembers,
      totalBaptizedSpouses,
      totalBaptizedChildren,
      birthdaysThisMonthMembers,
      birthdaysThisMonthSpouses,
      birthdaysThisMonthChildren,
      newThisMonth,
      newLastMonth,
      duplicates,
      totalSpouses,
      totalChildren,
    ] = await Promise.all([
      // Total membros principais ativos
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(eq(members.isActive, true)),

      // Por tipo (membros principais)
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

      // Batizados - membros principais
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(eq(members.isActive, true), eq(members.isBaptized, true))),

      // Batizados - cônjuges (spouseName preenchido e spouseIsBaptized = true)
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            eq(members.spouseIsBaptized, true),
            sql`${members.spouseName} IS NOT NULL AND ${members.spouseName} != ''`
          )
        ),

      // Batizados - filhos
      db
        .select({ count: sql<number>`count(*)` })
        .from(memberChildren)
        .where(eq(memberChildren.isBaptized, true)),

      // Aniversariantes do mês - membros principais
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`MONTH(${members.birthDate}) = ${thisMonth}`
          )
        ),

      // Aniversariantes do mês - cônjuges
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`MONTH(${members.spouseBirthDate}) = ${thisMonth}`,
            sql`${members.spouseName} IS NOT NULL AND ${members.spouseName} != ''`
          )
        ),

      // Aniversariantes do mês - filhos
      db
        .select({ count: sql<number>`count(*)` })
        .from(memberChildren)
        .where(sql`MONTH(${memberChildren.birthDate}) = ${thisMonth}`),

      // Novos este mês (membros principais)
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

      // Cônjuges cadastrados (spouseName preenchido)
      db
        .select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            sql`${members.spouseName} IS NOT NULL AND ${members.spouseName} != ''`
          )
        ),

      // Filhos cadastrados
      db
        .select({ count: sql<number>`count(*)` })
        .from(memberChildren),
    ]);

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      if (row.memberType) typeMap[row.memberType] = Number(row.count);
    }

    const totalMembersCount = Number(totalMembers[0]?.count ?? 0);
    const totalSpousesCount = Number(totalSpouses[0]?.count ?? 0);
    const totalChildrenCount = Number(totalChildren[0]?.count ?? 0);
    const totalPeople = totalMembersCount + totalSpousesCount + totalChildrenCount;

    const totalBaptizedCount =
      Number(totalBaptizedMembers[0]?.count ?? 0) +
      Number(totalBaptizedSpouses[0]?.count ?? 0) +
      Number(totalBaptizedChildren[0]?.count ?? 0);

    const birthdaysCount =
      Number(birthdaysThisMonthMembers[0]?.count ?? 0) +
      Number(birthdaysThisMonthSpouses[0]?.count ?? 0) +
      Number(birthdaysThisMonthChildren[0]?.count ?? 0);

    const newThisMonthCount = Number(newThisMonth[0]?.count ?? 0);
    const newLastMonthCount = Number(newLastMonth[0]?.count ?? 0);
    const growthRate =
      newLastMonthCount > 0
        ? Math.round(((newThisMonthCount - newLastMonthCount) / newLastMonthCount) * 100)
        : 0;

    return {
      totalMembers: totalPeople,
      totalMembersOnly: totalMembersCount,
      totalSpouses: totalSpousesCount,
      totalChildren: totalChildrenCount,
      membrosAtivos: typeMap["membro_ativo"] ?? 0,
      frequentantes: typeMap["frequentante"] ?? 0,
      visitantes: typeMap["visitante"] ?? 0,
      afastados: typeMap["afastado"] ?? 0,
      totalFamilies: Number(totalFamilies[0]?.count ?? 0),
      totalBaptized: totalBaptizedCount,
      birthdaysThisMonth: birthdaysCount,
      newThisMonth: newThisMonthCount,
      growthRate,
      duplicates: Number(duplicates[0]?.count ?? 0),
    };
  }),

  // Distribuição por congregação
  byCongregation: pibbAdminProcedure.query(async () => {
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
  byMinistry: pibbAdminProcedure.query(async () => {
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

  // Faixa etária — inclui membros principais, cônjuges e filhos
  byAgeGroup: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

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

    function addAge(birthDate: Date | string | null) {
      if (!birthDate) return;
      const birth = new Date(birthDate);
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

    // Membros principais
    const memberRows = await db
      .select({ birthDate: members.birthDate, spouseBirthDate: members.spouseBirthDate, spouseName: members.spouseName })
      .from(members)
      .where(and(eq(members.isActive, true)));

    for (const row of memberRows) {
      addAge(row.birthDate);
      if (row.spouseName && row.spouseName.trim()) addAge(row.spouseBirthDate);
    }

    // Filhos
    const childRows = await db
      .select({ birthDate: memberChildren.birthDate })
      .from(memberChildren)
      .where(sql`${memberChildren.birthDate} IS NOT NULL`);

    for (const row of childRows) {
      addAge(row.birthDate);
    }

    return ORDER.filter((o) => counts[o]).map((name) => ({
      name,
      value: counts[name],
    }));
  }),

  // Crescimento mensal (últimos 12 meses)
  monthlyGrowth: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

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

  // Aniversariantes do mês atual — inclui cônjuges e filhos
  birthdaysThisMonth: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const thisMonth = now.getMonth() + 1;

    // Membros principais
    const memberBirthdays = await db
      .select({
        id: members.id,
        fullName: members.fullName,
        birthDate: members.birthDate,
        phone: members.phone,
        whatsapp: members.whatsapp,
        type: sql<string>`'membro'`,
      })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.birthDate}) = ${thisMonth}`
        )
      );

    // Cônjuges
    const spouseBirthdays = await db
      .select({
        id: members.id,
        fullName: members.spouseName,
        birthDate: members.spouseBirthDate,
        phone: members.spousePhone,
        whatsapp: members.spouseWhatsapp,
        type: sql<string>`'conjuge'`,
      })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.spouseBirthDate}) = ${thisMonth}`,
          sql`${members.spouseName} IS NOT NULL AND ${members.spouseName} != ''`
        )
      );

    // Filhos
    const childBirthdays = await db
      .select({
        id: memberChildren.id,
        fullName: memberChildren.fullName,
        birthDate: memberChildren.birthDate,
        phone: sql<string | null>`NULL`,
        whatsapp: sql<string | null>`NULL`,
        type: sql<string>`'filho'`,
      })
      .from(memberChildren)
      .where(sql`MONTH(${memberChildren.birthDate}) = ${thisMonth}`);

    const all = [
      ...memberBirthdays,
      ...spouseBirthdays,
      ...childBirthdays,
    ].sort((a, b) => {
      const dayA = a.birthDate ? new Date(a.birthDate).getDate() : 99;
      const dayB = b.birthDate ? new Date(b.birthDate).getDate() : 99;
      return dayA - dayB;
    });

    return all;
  }),

  // Membros com duplicidade
  duplicates: pibbAdminProcedure.query(async () => {
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
