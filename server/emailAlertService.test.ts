import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEmailAlertDeliveryConfiguration } = vi.hoisted(() => ({
  getEmailAlertDeliveryConfiguration: vi.fn(),
}));

vi.mock("./db", () => ({ getEmailAlertDeliveryConfiguration }));

import { sendNewRegistrationEmailAlert } from "./emailAlertService";

describe("alerta de novo cadastro por e-mail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("não tenta enviar enquanto o serviço não foi configurado", async () => {
    getEmailAlertDeliveryConfiguration.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      sendNewRegistrationEmailAlert({ fullName: "Visitante", memberType: "visitante", familyCode: "FAM-TESTE" }),
    ).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envia um aviso para os destinatários configurados", async () => {
    getEmailAlertDeliveryConfiguration.mockResolvedValue({
      recipients: ["pastor@pibbady.org.br", "lideranca@pibbady.org.br"],
      emailFrom: "alertas@pibbady.org.br",
      resendApiKey: "re_teste",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(
      sendNewRegistrationEmailAlert({
        fullName: "Visitante de Teste",
        memberType: "visitante",
        familyCode: "FAM-TESTE",
      }),
    ).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_teste" }),
      }),
    );
  });
});
