import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { whatsappConfig, whatsappMessages } from "../../drizzle/schema";
import { eq, desc, and, gte, like, or } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, deleteHeartbeatJob } from "../_core/heartbeat";

// ─── Evolution API helper ──────────────────────────────────────────────────────
async function evolutionRequest(
  apiUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown
) {
  const url = `${apiUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution API error ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

interface SendOptions {
  memberId?: number;
  memberName?: string;
  messageType?: string; // welcome | update | birthday | test | leadership
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  opts: SendOptions = {}
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const configs = await db.select().from(whatsappConfig).limit(1);
  const config = configs[0];
  if (!config || !config.isConnected) return false;

  // Normaliza o número: remove tudo que não é dígito, garante código do país
  const normalized = phone.replace(/\D/g, "");
  const withCountry = normalized.startsWith("55") ? normalized : `55${normalized}`;

  let success = false;
  let errorMsg: string | undefined;

  try {
    await evolutionRequest(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      "POST",
      `/message/sendText/${config.instanceName}`,
      {
        number: withCountry,
        textMessage: { text: message },
        options: { delay: 1200 },
      }
    );
    success = true;
  } catch (err: any) {
    console.error("[WhatsApp] Failed to send message:", err);
    errorMsg = err?.message || "Erro desconhecido";
  }

  // Registrar no histórico (não bloqueia o retorno)
  db.insert(whatsappMessages).values({
    memberId: opts.memberId ?? null,
    memberName: opts.memberName ?? null,
    phone: withCountry,
    messageType: opts.messageType ?? "manual",
    messageContent: message,
    status: success ? "sent" : "failed",
    errorMessage: errorMsg ?? null,
  }).catch((e) => console.error("[WhatsApp] Failed to log message:", e));

  return success;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const whatsappRouter = router({
  // Buscar configuração atual
  getConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config) return null;

    // Oculta a API key parcialmente
    return {
      ...config,
      evolutionApiKey: config.evolutionApiKey
        ? `${config.evolutionApiKey.slice(0, 6)}${"*".repeat(Math.max(0, config.evolutionApiKey.length - 6))}`
        : "",
    };
  }),

  // Salvar/atualizar configuração
  saveConfig: protectedProcedure
    .input(
      z.object({
        evolutionApiUrl: z.string().url("URL inválida"),
        evolutionApiKey: z.string().min(1, "API Key obrigatória"),
        instanceName: z.string().min(1).default("pibb"),
        leadershipPhone: z.string().optional(),
        welcomeMessage: z.string().optional(),
        birthdayMessage: z.string().optional(),
        welcomeMessageEnabled: z.boolean().default(true),
        birthdayMessageEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select().from(whatsappConfig).limit(1);

      if (existing.length > 0) {
        await db
          .update(whatsappConfig)
          .set({
            evolutionApiUrl: input.evolutionApiUrl,
            evolutionApiKey: input.evolutionApiKey,
            instanceName: input.instanceName,
            leadershipPhone: input.leadershipPhone || null,
            welcomeMessage: input.welcomeMessage || null,
            birthdayMessage: input.birthdayMessage || null,
            welcomeMessageEnabled: input.welcomeMessageEnabled,
            birthdayMessageEnabled: input.birthdayMessageEnabled,
            isConnected: false,
          })
          .where(eq(whatsappConfig.id, existing[0].id));
      } else {
        await db.insert(whatsappConfig).values({
          evolutionApiUrl: input.evolutionApiUrl,
          evolutionApiKey: input.evolutionApiKey,
          instanceName: input.instanceName,
          leadershipPhone: input.leadershipPhone || null,
          welcomeMessage: input.welcomeMessage || null,
          birthdayMessage: input.birthdayMessage || null,
          welcomeMessageEnabled: input.welcomeMessageEnabled,
          birthdayMessageEnabled: input.birthdayMessageEnabled,
          isConnected: false,
        });
      }

      return { success: true };
    }),

  // Verificar status da conexão com Evolution API
  checkConnection: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });

    try {
      const data = await evolutionRequest(
        config.evolutionApiUrl,
        config.evolutionApiKey,
        "GET",
        `/instance/connectionState/${config.instanceName}`
      );

      const connected =
        data?.instance?.state === "open" ||
        data?.state === "open" ||
        data?.connectionStatus === "open";

      await db
        .update(whatsappConfig)
        .set({ isConnected: connected })
        .where(eq(whatsappConfig.id, config.id));

      return { connected, state: data?.instance?.state || data?.state || "unknown" };
    } catch (err: any) {
      await db
        .update(whatsappConfig)
        .set({ isConnected: false })
        .where(eq(whatsappConfig.id, config.id));
      return { connected: false, state: "error", error: err.message };
    }
  }),

  // Gerar QR Code para conectar instância
  getQrCode: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });

    try {
      // Tenta criar a instância (ignora erro se já existir)
      await evolutionRequest(
        config.evolutionApiUrl,
        config.evolutionApiKey,
        "POST",
        "/instance/create",
        {
          instanceName: config.instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }
      ).catch(() => {});

      // Busca o QR Code
      const data = await evolutionRequest(
        config.evolutionApiUrl,
        config.evolutionApiKey,
        "GET",
        `/instance/connect/${config.instanceName}`
      );

      return {
        qrcode: data?.base64 || data?.qrcode?.base64 || null,
        pairingCode: data?.code || null,
      };
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),

  // Enviar mensagem de teste
  sendTest: protectedProcedure
    .input(z.object({ phone: z.string(), message: z.string() }))
    .mutation(async ({ input }) => {
      const ok = await sendWhatsAppMessage(input.phone, input.message, { messageType: "test", memberName: "Teste Manual" });
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar mensagem. Verifique se o WhatsApp está conectado." });
      return { success: true };
    }),

  // Ativar/desativar cron de aniversariantes
  toggleBirthdayCron: protectedProcedure
    .input(z.object({ enable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const configs = await db.select().from(whatsappConfig).limit(1);
      const config = configs[0];
      if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configure o WhatsApp primeiro" });

      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";

      if (input.enable) {
        if (config.birthdayCronTaskUid) {
          return { success: true, message: "Cron já está ativo" };
        }

        // Cria cron diário às 7h (UTC-3 = 10h UTC)
        const job = await createHeartbeatJob(
          {
            name: "birthday-notifications-pibb",
            cron: "0 0 10 * * *",
            path: "/api/scheduled/birthday-notifications",
            description: "Notificação diária de aniversariantes PIB Bady Bassitt",
          },
          sessionToken
        );

        await db
          .update(whatsappConfig)
          .set({ birthdayCronTaskUid: job.taskUid })
          .where(eq(whatsappConfig.id, config.id));

        return { success: true, message: "Notificações de aniversariantes ativadas! Serão enviadas todos os dias às 7h." };
      } else {
        if (!config.birthdayCronTaskUid) {
          return { success: true, message: "Cron já está inativo" };
        }

        await deleteHeartbeatJob(config.birthdayCronTaskUid, sessionToken);

        await db
          .update(whatsappConfig)
          .set({ birthdayCronTaskUid: null })
          .where(eq(whatsappConfig.id, config.id));

        return { success: true, message: "Notificações de aniversariantes desativadas." };
      }
    }),

  // Histórico de mensagens enviadas
  messageHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(30),
        status: z.enum(["all", "sent", "failed"]).default("all"),
        messageType: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(), // ISO date string
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions: any[] = [];

      if (input.status !== "all") {
        conditions.push(eq(whatsappMessages.status, input.status));
      }
      if (input.messageType && input.messageType !== "all") {
        conditions.push(eq(whatsappMessages.messageType, input.messageType));
      }
      if (input.search) {
        conditions.push(
          or(
            like(whatsappMessages.memberName, `%${input.search}%`),
            like(whatsappMessages.phone, `%${input.search}%`)
          )
        );
      }
      if (input.dateFrom) {
        conditions.push(gte(whatsappMessages.sentAt, new Date(input.dateFrom)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        db
          .select()
          .from(whatsappMessages)
          .where(whereClause)
          .orderBy(desc(whatsappMessages.sentAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db
          .select({ count: whatsappMessages.id })
          .from(whatsappMessages)
          .where(whereClause),
      ]);

      return {
        messages: rows,
        total: countRows.length,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(countRows.length / input.pageSize),
      };
    }),

  // Estatísticas rápidas do histórico
  messageStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const all = await db.select({ status: whatsappMessages.status, messageType: whatsappMessages.messageType }).from(whatsappMessages);

    const total = all.length;
    const sent = all.filter((m) => m.status === "sent").length;
    const failed = all.filter((m) => m.status === "failed").length;

    const byType: Record<string, number> = {};
    for (const m of all) {
      byType[m.messageType] = (byType[m.messageType] || 0) + 1;
    }

    return { total, sent, failed, byType };
  }),
});
