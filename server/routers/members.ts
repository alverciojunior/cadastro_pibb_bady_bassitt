import { z } from "zod";
import { router, publicProcedure, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, families, memberChildren, memberUpdates } from "../../drizzle/schema";
import { eq, or, and, like, desc, sql, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { invokeLLM } from "../_core/llm";
import { sendWhatsAppMessage } from "./whatsapp";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const childSchema = z.object({
  fullName: z.string().min(2),
  birthDate: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isBaptized: z.boolean().optional().default(false),
  baptismDate: z.string().optional().nullable(),
  ministry: z.string().optional().nullable(),
});

export const memberInputSchema = z.object({
  // Dados pessoais
  fullName: z.string().min(2, "Nome é obrigatório"),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(["masculino", "feminino", "outro"]).optional().nullable(),
  maritalStatus: z
    .enum(["solteiro", "casado", "uniao_estavel", "divorciado", "viuvo"])
    .optional()
    .nullable(),
  cpf: z.string().optional().nullable(),

  // Contato
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),

  // Endereço
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),

  // Igreja
  congregation: z.string().optional().nullable(),
  ministry: z.string().optional().nullable(),
  isBaptized: z.boolean().optional().default(false),
  baptismDate: z.string().optional().nullable(),
  isTither: z.enum(["sim", "nao", "ocasional"]).optional().nullable(),
  attendanceFrequency: z
    .enum(["sempre", "quase_sempre", "as_vezes", "raramente", "nunca"])
    .optional()
    .nullable(),
  serviceArea: z.string().optional().nullable(),
  gifts: z.string().optional().nullable(),

  // Cônjuge
  spouseName: z.string().optional().nullable(),
  spouseBirthDate: z.string().optional().nullable(),
  spousePhone: z.string().optional().nullable(),
  spouseWhatsapp: z.string().optional().nullable(),
  spouseEmail: z.string().optional().nullable(),
  spouseIsBaptized: z.boolean().optional().default(false),
  spouseBaptismDate: z.string().optional().nullable(),
  spouseMinistry: z.string().optional().nullable(),
  spouseServiceArea: z.string().optional().nullable(),
  spouseIsTither: z.enum(["sim", "nao", "ocasional"]).optional().nullable(),

  // Filhos
  children: z.array(childSchema).optional().default([]),

  // Classificação manual (opcional)
  memberType: z
    .enum(["membro_ativo", "frequentante", "visitante", "afastado"])
    .optional()
    .nullable(),

  // Observações
  pastoralNotes: z.string().optional().nullable(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyMember(data: {
  attendanceFrequency?: string | null;
  isBaptized?: boolean | null;
  memberType?: string | null;
  updatedAt?: Date;
}): "membro_ativo" | "frequentante" | "visitante" | "afastado" {
  const freq = data.attendanceFrequency;
  const baptized = data.isBaptized;

  if (freq === "sempre" && baptized) return "membro_ativo";
  if (freq === "sempre" || freq === "quase_sempre") return "frequentante";
  if (freq === "as_vezes") return "visitante";
  if (freq === "raramente" || freq === "nunca") return "afastado";
  return "visitante";
}

async function checkDuplicate(
  db: Awaited<ReturnType<typeof getDb>>,
  cpf?: string | null,
  phone?: string | null,
  excludeId?: number
) {
  if (!db) return false;
  const conditions = [];
  if (cpf && cpf.trim()) conditions.push(eq(members.cpf, cpf.trim()));
  if (phone && phone.trim()) conditions.push(eq(members.phone, phone.trim()));
  if (conditions.length === 0) return false;

  const query = db.select({ id: members.id }).from(members).where(or(...conditions)).limit(1);
  const result = await query;
  if (excludeId) return result.some((r) => r.id !== excludeId);
  return result.length > 0;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const membersRouter = router({
  // Criar membro (público - formulário de cadastro)
  create: publicProcedure.input(memberInputSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

    // Detectar duplicidade
    const isDuplicate = await checkDuplicate(db, input.cpf, input.phone);

    // Criar família
    const familyCode = `FAM-${nanoid(8).toUpperCase()}`;
    await db.insert(families).values({ familyCode });
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.familyCode, familyCode))
      .limit(1);

    // Classificar automaticamente
    const memberType = classifyMember(input);

    // Inserir membro
    await db.insert(members).values({
      familyId: family.id,
      fullName: input.fullName,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      gender: input.gender ?? null,
      maritalStatus: input.maritalStatus ?? null,
      cpf: input.cpf ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      email: input.email || null,
      street: input.street ?? null,
      number: input.number ?? null,
      complement: input.complement ?? null,
      neighborhood: input.neighborhood ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zipCode: input.zipCode ?? null,
      congregation: input.congregation ?? null,
      ministry: input.ministry ?? null,
      isBaptized: input.isBaptized ?? false,
      baptismDate: input.baptismDate ? new Date(input.baptismDate) : null,
      isTither: input.isTither ?? null,
      attendanceFrequency: input.attendanceFrequency ?? null,
      serviceArea: input.serviceArea ?? null,
      gifts: input.gifts ?? null,
      spouseName: input.spouseName ?? null,
      spouseBirthDate: input.spouseBirthDate ? new Date(input.spouseBirthDate) : null,
      spousePhone: input.spousePhone ?? null,
      spouseWhatsapp: input.spouseWhatsapp ?? null,
      spouseEmail: input.spouseEmail ?? null,
      spouseIsBaptized: input.spouseIsBaptized ?? false,
      spouseBaptismDate: input.spouseBaptismDate ? new Date(input.spouseBaptismDate) : null,
      spouseMinistry: input.spouseMinistry ?? null,
      spouseServiceArea: input.spouseServiceArea ?? null,
      spouseIsTither: input.spouseIsTither ?? null,
      memberType,
      pastoralNotes: input.pastoralNotes ?? null,
      hasDuplicate: isDuplicate,
      registeredByUserId: ctx.user?.id ?? null,
    });

    const [newMember] = await db
      .select()
      .from(members)
      .where(eq(members.familyId, family.id))
      .limit(1);

    // Inserir filhos com herança de telefone
    if (input.children && input.children.length > 0) {
      for (const child of input.children) {
        // Herdar telefone do titular se não preenchido
        const childPhone = child.phone || input.phone || null;
        await db.insert(memberChildren).values({
          memberId: newMember.id,
          familyId: family.id,
          fullName: child.fullName,
          birthDate: child.birthDate ? new Date(child.birthDate) : null,
          phone: childPhone,
          isBaptized: child.isBaptized ?? false,
          baptismDate: child.baptismDate ? new Date(child.baptismDate) : null,
          ministry: child.ministry ?? null,
        });
      }
    }

    // Herdar telefone do titular para cônjuge se não preenchido
    if (input.spouseName && !input.spousePhone) {
      await db
        .update(members)
        .set({ spousePhone: input.phone || null })
        .where(eq(members.id, newMember.id));
    }

    // Log de auditoria
    await db.insert(memberUpdates).values({
      memberId: newMember.id,
      updatedByUserId: ctx.user?.id ?? null,
      changeType: "create",
      changeDescription: `Novo cadastro: ${input.fullName}`,
    });

    // Notificar liderança
    const childrenInfo =
      input.children?.length
        ? `\n• Filhos: ${input.children.map((c) => c.fullName).join(", ")}`
        : "";
    const spouseInfo = input.spouseName ? `\n• Cônjuge: ${input.spouseName}` : "";

    await notifyOwner({
      title: `Novo cadastro: ${input.fullName}`,
      content: `Um novo cadastro foi realizado na plataforma PIB Bady Bassitt.\n\n• Nome: ${input.fullName}\n• Telefone: ${input.phone || "—"}\n• Congregação: ${input.congregation || "—"}\n• Ministério: ${input.ministry || "—"}\n• Classificação: ${memberType.replace("_", " ")}${spouseInfo}${childrenInfo}\n\n${isDuplicate ? "⚠️ ATENÇÃO: Possível duplicidade detectada (CPF ou telefone já cadastrado)." : ""}`,
    });

    // Enviar mensagem de boas-vindas via WhatsApp (não bloqueia o cadastro)
    // Respeita configuração welcomeMessageEnabled e mensagem personalizada
    const phoneForWA = input.whatsapp || input.phone;
    if (phoneForWA) {
      (async () => {
        try {
          const { whatsappConfig } = await import("../../drizzle/schema");
          const dbInner = await getDb();
          if (!dbInner) return;
          const configs = await dbInner.select().from(whatsappConfig).limit(1);
          const waCfg = configs[0];
          if (!waCfg || !waCfg.isConnected || !waCfg.welcomeMessageEnabled) return;
          const firstName = input.fullName.split(" ")[0];
          const welcomeMsg = waCfg.welcomeMessage
            ? waCfg.welcomeMessage.replace("{nome}", firstName).replace("{name}", firstName)
            : `Olá, *${firstName}*! 😊\n\nSeu cadastro na *PIB Bady Bassitt* foi realizado com sucesso! 🙏\n\nEstamos muito felizes em ter você registrado(a) em nossa família. Que Deus abençoe sua vida!\n\n_PIB Bady Bassitt_`;
          await sendWhatsAppMessage(phoneForWA, welcomeMsg, {
            memberId: newMember.id,
            memberName: input.fullName,
            messageType: "welcome",
          });
        } catch (err) {
          console.error("[WhatsApp] Erro ao enviar boas-vindas:", err);
        }
      })();
    }

    return { success: true, memberId: newMember.id, familyCode, memberType, isDuplicate };
  }),

  // Atualizar membro
  update: pibbAdminProcedure
    .input(z.object({ id: z.number(), data: memberInputSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const isDuplicate = await checkDuplicate(db, input.data.cpf, input.data.phone, input.id);
      const memberType = classifyMember(input.data);

      await db
        .update(members)
        .set({
          fullName: input.data.fullName,
          birthDate: input.data.birthDate ? new Date(input.data.birthDate) : null,
          gender: input.data.gender ?? null,
          maritalStatus: input.data.maritalStatus ?? null,
          cpf: input.data.cpf ?? null,
          phone: input.data.phone ?? null,
          whatsapp: input.data.whatsapp ?? null,
          email: input.data.email || null,
          street: input.data.street ?? null,
          number: input.data.number ?? null,
          complement: input.data.complement ?? null,
          neighborhood: input.data.neighborhood ?? null,
          city: input.data.city ?? null,
          state: input.data.state ?? null,
          zipCode: input.data.zipCode ?? null,
          congregation: input.data.congregation ?? null,
          ministry: input.data.ministry ?? null,
          isBaptized: input.data.isBaptized ?? false,
          baptismDate: input.data.baptismDate ? new Date(input.data.baptismDate) : null,
          isTither: input.data.isTither ?? null,
          attendanceFrequency: input.data.attendanceFrequency ?? null,
          serviceArea: input.data.serviceArea ?? null,
          gifts: input.data.gifts ?? null,
          spouseName: input.data.spouseName ?? null,
          spouseBirthDate: input.data.spouseBirthDate ? new Date(input.data.spouseBirthDate) : null,
          spousePhone: input.data.spousePhone ?? null,
          spouseWhatsapp: input.data.spouseWhatsapp ?? null,
          spouseEmail: input.data.spouseEmail ?? null,
          spouseIsBaptized: input.data.spouseIsBaptized ?? false,
          spouseBaptismDate: input.data.spouseBaptismDate ? new Date(input.data.spouseBaptismDate) : null,
          spouseMinistry: input.data.spouseMinistry ?? null,
          spouseServiceArea: input.data.spouseServiceArea ?? null,
          spouseIsTither: input.data.spouseIsTither ?? null,
          memberType: input.data.memberType ?? memberType,
          pastoralNotes: input.data.pastoralNotes ?? null,
          hasDuplicate: isDuplicate,
          lastUpdatedByUserId: ctx.user?.id ?? ctx.admin?.id ?? null,
        })
        .where(eq(members.id, input.id));

      // Atualizar filhos com herança de telefone
      await db.delete(memberChildren).where(eq(memberChildren.memberId, input.id));
      if (input.data.children && input.data.children.length > 0) {
        const [member] = await db.select().from(members).where(eq(members.id, input.id)).limit(1);
        for (const child of input.data.children) {
          // Herdar telefone do titular se não preenchido
          const childPhone = child.phone || input.data.phone || null;
          await db.insert(memberChildren).values({
            memberId: input.id,
            familyId: member.familyId,
            fullName: child.fullName,
            birthDate: child.birthDate ? new Date(child.birthDate) : null,
            phone: childPhone,
            isBaptized: child.isBaptized ?? false,
            baptismDate: child.baptismDate ? new Date(child.baptismDate) : null,
            ministry: child.ministry ?? null,
          });
        }
      }

      // Herdar telefone do titular para cônjuge se não preenchido
      if (input.data.spouseName && !input.data.spousePhone) {
        await db
          .update(members)
          .set({ spousePhone: input.data.phone || null })
          .where(eq(members.id, input.id));
      }

      await db.insert(memberUpdates).values({
        memberId: input.id,
        updatedByUserId: ctx.user?.id ?? ctx.admin?.id ?? null,
        changeType: "update",
        changeDescription: `Dados atualizados por ${ctx.user?.name || ctx.user?.email || ctx.admin?.username || "admin"}`,
      });

      await notifyOwner({
        title: `Cadastro atualizado: ${input.data.fullName}`,
        content: `O membro ${input.data.fullName} atualizou seus dados cadastrais.\n\n• Congregação: ${input.data.congregation || "—"}\n• Ministério: ${input.data.ministry || "—"}\n• Classificação: ${memberType.replace("_", " ")}`,
      });

      // Notificar membro via WhatsApp sobre atualização
      // Respeita configuração isConnected e welcomeMessageEnabled
      const phoneForWA = input.data.whatsapp || input.data.phone;
      if (phoneForWA) {
        (async () => {
          try {
            const { whatsappConfig } = await import("../../drizzle/schema");
            const dbInner = await getDb();
            if (!dbInner) return;
            const configs = await dbInner.select().from(whatsappConfig).limit(1);
            const waCfg = configs[0];
            if (!waCfg || !waCfg.isConnected || !waCfg.welcomeMessageEnabled) return;
            const firstName = input.data.fullName.split(" ")[0];
            const updateMsg = `Olá, *${firstName}*! 🙏\n\nSeu cadastro na *PIB Bady Bassitt* foi atualizado com sucesso!\n\nSe precisar de algo, estamos à disposição.\n\n_PIB Bady Bassitt_`;
            await sendWhatsAppMessage(phoneForWA, updateMsg, {
              memberId: input.id,
              memberName: input.data.fullName,
              messageType: "update",
            });
          } catch (err) {
            console.error("[WhatsApp] Erro ao enviar notificação de atualização:", err);
          }
        })();
      }

      return { success: true, memberType, isDuplicate };
    }),

  // Listar membros (admin)
  list: pibbAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        memberType: z.string().optional(),
        congregation: z.string().optional(),
        ministry: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [eq(members.isActive, true)];

      if (input.search) {
        conditions.push(
          or(
            like(members.fullName, `%${input.search}%`),
            like(members.spouseName, `%${input.search}%`),
            like(members.phone, `%${input.search}%`),
            like(members.cpf, `%${input.search}%`)
          ) as any
        );
      }
      if (input.memberType) {
        conditions.push(eq(members.memberType, input.memberType as any));
      }
      if (input.congregation) {
        conditions.push(eq(members.congregation, input.congregation));
      }
      if (input.ministry) {
        conditions.push(eq(members.ministry, input.ministry));
      }

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(members)
          .where(and(...conditions))
          .orderBy(desc(members.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(members)
          .where(and(...conditions)),
      ]);

      return { items, total: Number(countResult[0]?.count ?? 0) };
    }),

  // Buscar membro por ID
  getById: pibbAdminProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "NOT_FOUND" });

    const [member] = await db.select().from(members).where(eq(members.id, input)).limit(1);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const children = await db
      .select()
      .from(memberChildren)
      .where(eq(memberChildren.memberId, input));

    return { ...member, children };
  }),

  // Verificar duplicidade em tempo real
  checkDuplicate: publicProcedure
    .input(z.object({ cpf: z.string().optional(), phone: z.string().optional(), excludeId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { isDuplicate: false };
      const isDuplicate = await checkDuplicate(db, input.cpf, input.phone, input.excludeId);
      return { isDuplicate };
    }),

  // Gerar sugestões pastorais com IA
  generatePastoralSuggestions: pibbAdminProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await db.select().from(members).where(eq(members.id, input)).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const children = await db
        .select()
        .from(memberChildren)
        .where(eq(memberChildren.memberId, input));

      const frequencyMap: Record<string, string> = {
        sempre: "frequenta todos os cultos",
        quase_sempre: "frequenta quase sempre",
        as_vezes: "frequenta às vezes",
        raramente: "raramente frequenta",
        nunca: "não frequenta",
      };

      const prompt = `Você é um assistente pastoral especializado em cuidado de membros de igrejas evangélicas.

Com base nos dados do membro abaixo, gere observações pastorais e sugestões de acompanhamento em português brasileiro, de forma acolhedora e prática.

DADOS DO MEMBRO:
- Nome: ${member.fullName}
- Classificação: ${member.memberType?.replace("_", " ") || "visitante"}
- Frequência: ${frequencyMap[member.attendanceFrequency || ""] || "não informada"}
- Ministério: ${member.ministry || "não informado"}
- Batizado: ${member.isBaptized ? "sim" : "não"}
- Dizimista: ${member.isTither || "não informado"}
- Estado civil: ${member.maritalStatus || "não informado"}
- Cônjuge: ${member.spouseName || "não informado"}
- Filhos: ${children.length > 0 ? children.map((c) => c.fullName).join(", ") : "nenhum"}
- Área de interesse/dom: ${member.serviceArea || "não informado"}
- Observações existentes: ${member.pastoralNotes || "nenhuma"}

Gere:
1. Uma análise pastoral breve (2-3 frases)
2. 3 sugestões práticas de acompanhamento pastoral
3. Alertas pastorais (se houver)

Seja acolhedor, respeitoso e prático. Máximo 300 palavras.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um assistente pastoral de uma igreja batista brasileira." },
          { role: "user", content: prompt },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      const suggestions = typeof rawContent === "string" ? rawContent : "";

      await db
        .update(members)
        .set({ aiPastoralSuggestions: suggestions })
        .where(eq(members.id, input));

      return { suggestions };
    }),

  // Atualizar observações pastorais manualmente
  updatePastoralNotes: pibbAdminProcedure
    .input(z.object({ id: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(members).set({ pastoralNotes: input.notes }).where(eq(members.id, input.id));
      return { success: true };
    }),

  // Desativar membro
  deactivate: pibbAdminProcedure.input(z.number()).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(members).set({ isActive: false }).where(eq(members.id, input));
    return { success: true };
  }),

  // Excluir membro
  delete: pibbAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Excluir filhos
      await db.delete(memberChildren).where(eq(memberChildren.memberId, input.id));

      // Excluir atualizações
      await db.delete(memberUpdates).where(eq(memberUpdates.memberId, input.id));

      // Excluir membro
      await db.delete(members).where(eq(members.id, input.id));

      return { success: true };
    }),

  // Listar congregações e ministérios únicos
  getOptions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { congregations: [], ministries: [] };

    const [congregations, ministries] = await Promise.all([
      db
        .selectDistinct({ value: members.congregation })
        .from(members)
        .where(and(eq(members.isActive, true), sql`${members.congregation} IS NOT NULL`)),
      db
        .selectDistinct({ value: members.ministry })
        .from(members)
        .where(and(eq(members.isActive, true), sql`${members.ministry} IS NOT NULL`)),
    ]);

    return {
      congregations: congregations.map((c) => c.value).filter(Boolean),
      ministries: ministries.map((m) => m.value).filter(Boolean),
    };
  }),
});
