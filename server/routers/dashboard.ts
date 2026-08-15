import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, families, memberChildren } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const dashboardRouter = router({
  // ─── KPIs principais ────────────────────────────────────────────────────────
  kpis: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Buscar todos os membros ativos com seus dados
    const allMembers = await db
      .select({
        id: members.id,
        memberType: members.memberType,
        isBaptized: members.isBaptized,
        isTither: members.isTither,
        spouseName: members.spouseName,
        spouseIsBaptized: members.spouseIsBaptized,
        spouseIsTither: members.spouseIsTither,
        createdAt: members.createdAt,
        hasDuplicate: members.hasDuplicate,
      })
      .from(members)
      .where(eq(members.isActive, true));

    // Buscar todos os filhos
    const allChildren = await db
      .select({
        id: memberChildren.id,
        memberId: memberChildren.memberId,
        isBaptized: memberChildren.isBaptized,
        birthDate: memberChildren.birthDate,
      })
      .from(memberChildren);

    // Mapear memberId → memberType para herança dos filhos
    const memberTypeMap = new Map(allMembers.map((m) => [m.id, m.memberType]));

    // Contagens por tipo — titular + cônjuge (herda tipo) + filhos (herdam tipo)
    const typeCounts: Record<string, number> = {
      membro_ativo: 0,
      frequentante: 0,
      visitante: 0,
      afastado: 0,
    };

    let totalMembersOnly = 0;
    let totalSpouses = 0;
    let totalBaptized = 0;
    let newThisMonth = 0;
    let newLastMonth = 0;
    let duplicates = 0;
    const titherCounts: Record<string, number> = { sim: 0, nao: 0, ocasional: 0 };

    for (const m of allMembers) {
      totalMembersOnly++;
      const type = m.memberType ?? "visitante";
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;

      if (m.isBaptized) totalBaptized++;

      // Dízimo do titular
      const tither = m.isTither ?? null;
      if (tither && tither in titherCounts) titherCounts[tither]++;

      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      if (createdAt) {
        if (
          createdAt.getFullYear() === thisYear &&
          createdAt.getMonth() + 1 === thisMonth
        ) {
          newThisMonth++;
        }
        if (
          createdAt.getFullYear() === lastMonth.getFullYear() &&
          createdAt.getMonth() + 1 === lastMonth.getMonth() + 1
        ) {
          newLastMonth++;
        }
      }

      if (m.hasDuplicate) duplicates++;

      // Cônjuge herda tipo do titular
      const hasSpouse = m.spouseName && m.spouseName.trim() !== "";
      if (hasSpouse) {
        totalSpouses++;
        typeCounts[type] = (typeCounts[type] ?? 0) + 1;
        if (m.spouseIsBaptized) totalBaptized++;

        // Dízimo do cônjuge
        const spouseTither = m.spouseIsTither ?? null;
        if (spouseTither && spouseTither in titherCounts) titherCounts[spouseTither]++;

        // Cônjuge conta como novo no mesmo mês do titular
        const createdAt = m.createdAt ? new Date(m.createdAt) : null;
        if (createdAt) {
          if (
            createdAt.getFullYear() === thisYear &&
            createdAt.getMonth() + 1 === thisMonth
          ) {
            newThisMonth++;
          }
          if (
            createdAt.getFullYear() === lastMonth.getFullYear() &&
            createdAt.getMonth() + 1 === lastMonth.getMonth() + 1
          ) {
            newLastMonth++;
          }
        }
      }
    }

    // Mapear memberId → createdAt do titular para filhos
    const memberCreatedAtMap = new Map(allMembers.map((m) => [m.id, m.createdAt]));

    // Filhos herdam tipo do titular
    let totalChildren = 0;
    for (const child of allChildren) {
      totalChildren++;
      const type = memberTypeMap.get(child.memberId) ?? "visitante";
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
      if (child.isBaptized) totalBaptized++;

      // Filho conta como novo no mesmo mês do cadastro do titular
      const parentCreatedAt = memberCreatedAtMap.get(child.memberId);
      if (parentCreatedAt) {
        const d = new Date(parentCreatedAt);
        if (d.getFullYear() === thisYear && d.getMonth() + 1 === thisMonth) {
          newThisMonth++;
        }
        if (
          d.getFullYear() === lastMonth.getFullYear() &&
          d.getMonth() + 1 === lastMonth.getMonth() + 1
        ) {
          newLastMonth++;
        }
      }
    }

    const totalPeople = totalMembersOnly + totalSpouses + totalChildren;
    const growthRate =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
        : 0;

    // Total de famílias
    const [familiesRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(families);

    // Aniversariantes do mês — membros + cônjuges + filhos
    const birthdayMembersRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.birthDate}) = ${thisMonth}`
        )
      );
    const birthdaySpousesRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.spouseBirthDate}) = ${thisMonth}`,
          sql`${members.spouseName} IS NOT NULL AND ${members.spouseName} != ''`
        )
      );
    const birthdayChildrenRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberChildren)
      .where(sql`MONTH(${memberChildren.birthDate}) = ${thisMonth}`);

    const birthdaysThisMonth =
      Number(birthdayMembersRows[0]?.count ?? 0) +
      Number(birthdaySpousesRows[0]?.count ?? 0) +
      Number(birthdayChildrenRows[0]?.count ?? 0);

    return {
      totalMembers: totalPeople,
      totalMembersOnly,
      totalSpouses,
      totalChildren,
      membrosAtivos: typeCounts["membro_ativo"] ?? 0,
      frequentantes: typeCounts["frequentante"] ?? 0,
      visitantes: typeCounts["visitante"] ?? 0,
      afastados: typeCounts["afastado"] ?? 0,
      totalFamilies: Number(familiesRow?.count ?? 0),
      totalBaptized,
      birthdaysThisMonth,
      newThisMonth,
      growthRate,
      duplicates,
      titherCounts,
    };
  }),

  // ─── Distribuição por congregação — titular + cônjuge (mesma congregação) + filhos ─
  byCongregation: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const memberRows = await db
      .select({
        id: members.id,
        congregation: members.congregation,
        spouseName: members.spouseName,
      })
      .from(members)
      .where(and(eq(members.isActive, true)));

    // Buscar todos os filhos com o memberId
    const childRows = await db
      .select({ memberId: memberChildren.memberId })
      .from(memberChildren);

    // Mapear memberId -> número de filhos
    const childCountByMember = new Map<number, number>();
    for (const c of childRows) {
      childCountByMember.set(c.memberId, (childCountByMember.get(c.memberId) ?? 0) + 1);
    }

    const counts: Record<string, number> = {};
    for (const row of memberRows) {
      const cong = row.congregation?.trim() || "Não informado";
      // Titular
      counts[cong] = (counts[cong] ?? 0) + 1;
      // Cônjuge herda congregação
      if (row.spouseName && row.spouseName.trim()) {
        counts[cong] = (counts[cong] ?? 0) + 1;
      }
      // Filhos herdam congregação
      const childCount = childCountByMember.get(row.id) ?? 0;
      counts[cong] = (counts[cong] ?? 0) + childCount;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }),

  // ─── Distribuição por ministério — titular + cônjuge (spouseMinistry) + filhos (ministry) ─
  byMinistry: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const memberRows = await db
      .select({
        ministry: members.ministry,
        spouseMinistry: members.spouseMinistry,
        spouseName: members.spouseName,
      })
      .from(members)
      .where(and(eq(members.isActive, true)));

    const childRows = await db
      .select({ ministry: memberChildren.ministry })
      .from(memberChildren)
      .where(sql`${memberChildren.ministry} IS NOT NULL AND ${memberChildren.ministry} != ''`);

    const counts: Record<string, number> = {};

    for (const row of memberRows) {
      const m = row.ministry?.trim() || "Sem ministério";
      counts[m] = (counts[m] ?? 0) + 1;

      if (row.spouseName && row.spouseName.trim()) {
        const sm = row.spouseMinistry?.trim() || "Sem ministério";
        counts[sm] = (counts[sm] ?? 0) + 1;
      }
    }

    for (const row of childRows) {
      const cm = row.ministry?.trim() || "Sem ministério";
      counts[cm] = (counts[cm] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }),

  // ─── Faixa etária — titular + cônjuge + filhos ───────────────────────────────
  byAgeGroup: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const ORDER = [
      "Criança (0-11)",
      "Adolescente (12-17)",
      "Jovem (18-29)",
      "Adulto (30-44)",
      "Adulto (45-59)",
      "Idoso (60+)",
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
      if (age < 12) label = "Criança (0-11)";
      else if (age < 18) label = "Adolescente (12-17)";
      else if (age < 30) label = "Jovem (18-29)";
      else if (age < 45) label = "Adulto (30-44)";
      else if (age < 60) label = "Adulto (45-59)";
      else label = "Idoso (60+)";
      counts[label] = (counts[label] ?? 0) + 1;
    }

    const memberRows = await db
      .select({
        birthDate: members.birthDate,
        spouseBirthDate: members.spouseBirthDate,
        spouseName: members.spouseName,
      })
      .from(members)
      .where(and(eq(members.isActive, true)));

    for (const row of memberRows) {
      addAge(row.birthDate);
      if (row.spouseName && row.spouseName.trim()) addAge(row.spouseBirthDate);
    }

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

  // ─── Crescimento mensal — conta titular + cônjuge + filhos no mês do cadastro ─
  monthlyGrowth: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);

    const rows = await db
      .select({
        id: members.id,
        createdAt: members.createdAt,
        spouseName: members.spouseName,
      })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`${members.createdAt} >= ${cutoff.toISOString().slice(0, 10)}`
        )
      );

    // Buscar todos os filhos com o memberId
    const childRows = await db
      .select({ memberId: memberChildren.memberId })
      .from(memberChildren);

    const childCountByMember = new Map<number, number>();
    for (const c of childRows) {
      childCountByMember.set(c.memberId, (childCountByMember.get(c.memberId) ?? 0) + 1);
    }

    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (!row.createdAt) continue;
      const d = new Date(row.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Titular
      counts[key] = (counts[key] ?? 0) + 1;
      // Cônjuge
      if (row.spouseName && row.spouseName.trim()) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
      // Filhos
      const childCount = childCountByMember.get(row.id) ?? 0;
      counts[key] = (counts[key] ?? 0) + childCount;
    }

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }),

  // ─── Aniversariantes do mês — titular + cônjuge + filhos ────────────────────
  birthdaysThisMonth: pibbAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const thisMonth = now.getMonth() + 1;

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

    const childBirthdays = await db
      .select({
        id: memberChildren.id,
        fullName: memberChildren.fullName,
        birthDate: memberChildren.birthDate,
        phone: memberChildren.phone,
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

  // ─── Membros com duplicidade ─────────────────────────────────────────────────
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
