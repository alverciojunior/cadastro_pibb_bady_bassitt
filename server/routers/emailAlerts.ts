import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getEmailAlertRecipients,
  getEmailServiceConfiguration,
  saveEmailAlertRecipients,
  saveEmailServiceConfiguration,
} from "../db";
import { pibbAdminProcedure, router } from "../_core/trpc";

const optionalEmailSchema = z
  .union([z.string().trim().email("Informe um e-mail válido"), z.literal("")])
  .transform((value) => value || null);

export const emailAlertSettingsInputSchema = z.object({
  primaryEmail: z.string().trim().email("Informe o e-mail principal"),
  optionalEmail1: optionalEmailSchema,
  optionalEmail2: optionalEmailSchema,
  optionalEmail3: optionalEmailSchema,
  optionalEmail4: optionalEmailSchema,
});

const emptySettings = {
  primaryEmail: "",
  optionalEmail1: "",
  optionalEmail2: "",
  optionalEmail3: "",
  optionalEmail4: "",
};

const emailServiceInputSchema = z.object({
  emailFrom: optionalEmailSchema,
  resendApiKey: z.string().trim().max(512, "A chave informada é muito longa").optional().transform((value) => value || undefined),
});

export const emailAlertsRouter = router({
  getSettings: pibbAdminProcedure.query(async () => {
    const settings = await getEmailAlertRecipients();
    if (settings === undefined) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
    }

    return settings
      ? {
          primaryEmail: settings.primaryEmail,
          optionalEmail1: settings.optionalEmail1 ?? "",
          optionalEmail2: settings.optionalEmail2 ?? "",
          optionalEmail3: settings.optionalEmail3 ?? "",
          optionalEmail4: settings.optionalEmail4 ?? "",
        }
      : emptySettings;
  }),

  saveSettings: pibbAdminProcedure
    .input(emailAlertSettingsInputSchema)
    .mutation(async ({ input }) => {
      const saved = await saveEmailAlertRecipients(input);
      if (!saved) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      }

      return { success: true };
    }),

  getServiceConfig: pibbAdminProcedure.query(async () => {
    const settings = await getEmailServiceConfiguration();
    if (!settings) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
    }

    return settings;
  }),

  saveServiceConfig: pibbAdminProcedure
    .input(emailServiceInputSchema)
    .mutation(async ({ input }) => {
      const saved = await saveEmailServiceConfiguration(input);
      if (!saved) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Salve primeiro pelo menos o e-mail principal dos destinatários.",
        });
      }

      return { success: true };
    }),
});
