import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { members, whatsappConfig } from "../../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendWhatsAppMessage } from "../routers/whatsapp";
import { notifyOwner } from "../_core/notification";

export async function birthdayNotificationsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const now = new Date();
    const today = now.getMonth() + 1; // mês atual (1-12)
    const todayDay = now.getDate();

    // Busca aniversariantes de hoje
    const todayBirthdays = await db
      .select({
        id: members.id,
        fullName: members.fullName,
        phone: members.phone,
        whatsapp: members.whatsapp,
        birthDate: members.birthDate,
      })
      .from(members)
      .where(
        and(
          eq(members.isActive, true),
          sql`MONTH(${members.birthDate}) = ${today}`,
          sql`DAY(${members.birthDate}) = ${todayDay}`
        )
      );

    // Busca configuração do WhatsApp
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];

    let whatsappSent = 0;
    let leadershipNotified = false;

    if (todayBirthdays.length === 0) {
      return res.json({ ok: true, message: "Nenhum aniversariante hoje", sent: 0 });
    }

    // Monta lista de aniversariantes para a liderança
    const birthdayList = todayBirthdays
      .map((m) => {
        const birth = m.birthDate ? new Date(m.birthDate) : null;
        const age = birth ? now.getFullYear() - birth.getFullYear() : null;
        return `• ${m.fullName}${age ? ` (${age} anos)` : ""}${m.whatsapp || m.phone ? ` — ${m.whatsapp || m.phone}` : ""}`;
      })
      .join("\n");

    // Envia mensagem para cada aniversariante (se WhatsApp conectado)
    if (config?.isConnected && config.birthdayMessageEnabled) {
      for (const member of todayBirthdays) {
        const phone = member.whatsapp || member.phone;
        if (!phone) continue;

        const message =
          config.birthdayMessage ||
          `🎂 *Feliz Aniversário, ${member.fullName.split(" ")[0]}!*\n\nA família da PIB Bady Bassitt deseja a você um dia muito abençoado! Que Deus continue te guiando e abençoando sua vida. 🙏\n\n_Com carinho, PIB Bady Bassitt_`;

        const ok = await sendWhatsAppMessage(phone, message, {
          memberId: member.id,
          memberName: member.fullName,
          messageType: "birthday",
        });
        if (ok) whatsappSent++;
      }

      // Notifica liderança via WhatsApp se tiver número configurado
      if (config.leadershipPhone) {
        const leaderMsg =
          `📋 *Aniversariantes de hoje — ${now.toLocaleDateString("pt-BR")}*\n\n${birthdayList}\n\nTotal: ${todayBirthdays.length} aniversariante(s)`;
        await sendWhatsAppMessage(config.leadershipPhone, leaderMsg, {
          messageType: "leadership",
          memberName: "Liderança",
        });
        leadershipNotified = true;
      }
    }

    // Notifica liderança via sistema (notificação interna)
    await notifyOwner({
      title: `🎂 ${todayBirthdays.length} aniversariante(s) hoje — ${now.toLocaleDateString("pt-BR")}`,
      content: `${birthdayList}\n\n${whatsappSent > 0 ? `✅ ${whatsappSent} mensagem(ns) enviada(s) via WhatsApp.` : "⚠️ WhatsApp não conectado — mensagens não enviadas."}`,
    });

    return res.json({
      ok: true,
      total: todayBirthdays.length,
      whatsappSent,
      leadershipNotified,
    });
  } catch (err: any) {
    console.error("[BirthdayNotifications] Error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
