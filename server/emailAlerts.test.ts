import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { emailAlertSettingsInputSchema, emailAlertsRouter } from "./routers/emailAlerts";

const {
  getEmailAlertRecipients,
  saveEmailAlertRecipients,
  getEmailServiceConfiguration,
  saveEmailServiceConfiguration,
} = vi.hoisted(() => ({
  getEmailAlertRecipients: vi.fn(),
  saveEmailAlertRecipients: vi.fn(),
  getEmailServiceConfiguration: vi.fn(),
  saveEmailServiceConfiguration: vi.fn(),
}));

vi.mock("./db", () => ({
  getEmailAlertRecipients,
  saveEmailAlertRecipients,
  getEmailServiceConfiguration,
  saveEmailServiceConfiguration,
}));

function createAdminContext(): TrpcContext {
  return {
    user: null,
    admin: { id: 1, username: "admin" },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("emailAlertSettingsInputSchema", () => {
  it("aceita um destinatário obrigatório e quatro destinatários opcionais", () => {
    const result = emailAlertSettingsInputSchema.parse({
      primaryEmail: "pastor@pibbady.org.br",
      optionalEmail1: "lideranca1@pibbady.org.br",
      optionalEmail2: "lideranca2@pibbady.org.br",
      optionalEmail3: "",
      optionalEmail4: "",
    });

    expect(result).toEqual({
      primaryEmail: "pastor@pibbady.org.br",
      optionalEmail1: "lideranca1@pibbady.org.br",
      optionalEmail2: "lideranca2@pibbady.org.br",
      optionalEmail3: null,
      optionalEmail4: null,
    });
  });

  it("rejeita a ausência do destinatário principal", () => {
    expect(() =>
      emailAlertSettingsInputSchema.parse({
        primaryEmail: "",
        optionalEmail1: "",
        optionalEmail2: "",
        optionalEmail3: "",
        optionalEmail4: "",
      }),
    ).toThrow();
  });

  it("rejeita endereços inválidos nos campos opcionais preenchidos", () => {
    expect(() =>
      emailAlertSettingsInputSchema.parse({
        primaryEmail: "pastor@pibbady.org.br",
        optionalEmail1: "email-invalido",
        optionalEmail2: "",
        optionalEmail3: "",
        optionalEmail4: "",
      }),
    ).toThrow("Informe um e-mail válido");
  });
});

describe("emailAlerts router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna campos vazios quando os destinatários ainda não foram configurados", async () => {
    getEmailAlertRecipients.mockResolvedValue(null);
    const caller = emailAlertsRouter.createCaller(createAdminContext());

    await expect(caller.getSettings()).resolves.toEqual({
      primaryEmail: "",
      optionalEmail1: "",
      optionalEmail2: "",
      optionalEmail3: "",
      optionalEmail4: "",
    });
  });

  it("salva os cinco destinatários após validar os endereços", async () => {
    saveEmailAlertRecipients.mockResolvedValue(true);
    const caller = emailAlertsRouter.createCaller(createAdminContext());
    const input = {
      primaryEmail: "pastor@pibbady.org.br",
      optionalEmail1: "lideranca1@pibbady.org.br",
      optionalEmail2: "",
      optionalEmail3: "",
      optionalEmail4: "lideranca4@pibbady.org.br",
    };

    await expect(caller.saveSettings(input)).resolves.toEqual({ success: true });
    expect(saveEmailAlertRecipients).toHaveBeenCalledWith({
      primaryEmail: "pastor@pibbady.org.br",
      optionalEmail1: "lideranca1@pibbady.org.br",
      optionalEmail2: null,
      optionalEmail3: null,
      optionalEmail4: "lideranca4@pibbady.org.br",
    });
  });

  it("retorna apenas o estado da chave, sem expor seu conteúdo", async () => {
    getEmailServiceConfiguration.mockResolvedValue({
      emailFrom: "alertas@pibbady.org.br",
      hasResendApiKey: true,
    });
    const caller = emailAlertsRouter.createCaller(createAdminContext());

    await expect(caller.getServiceConfig()).resolves.toEqual({
      emailFrom: "alertas@pibbady.org.br",
      hasResendApiKey: true,
    });
  });

  it("mantém a chave existente quando o campo de troca fica vazio", async () => {
    saveEmailServiceConfiguration.mockResolvedValue(true);
    const caller = emailAlertsRouter.createCaller(createAdminContext());

    await expect(
      caller.saveServiceConfig({ emailFrom: "alertas@pibbady.org.br", resendApiKey: "" }),
    ).resolves.toEqual({ success: true });
    expect(saveEmailServiceConfiguration).toHaveBeenCalledWith({
      emailFrom: "alertas@pibbady.org.br",
      resendApiKey: undefined,
    });
  });
});
