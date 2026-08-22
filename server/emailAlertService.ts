import { getEmailAlertDeliveryConfiguration } from "./db";

type RegistrationAlert = {
  fullName: string;
  memberType: "membro_ativo" | "frequentante" | "visitante" | "afastado";
  familyCode: string;
};

const memberTypeLabels: Record<RegistrationAlert["memberType"], string> = {
  membro_ativo: "Membro ativo",
  frequentante: "Frequentante",
  visitante: "Visitante",
  afastado: "Membro afastado",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export async function sendNewRegistrationEmailAlert(alert: RegistrationAlert): Promise<boolean> {
  const configuration = await getEmailAlertDeliveryConfiguration();
  if (!configuration || configuration.recipients.length === 0) return false;

  const category = memberTypeLabels[alert.memberType];
  const safeName = escapeHtml(alert.fullName);
  const safeFamilyCode = escapeHtml(alert.familyCode);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: configuration.emailFrom,
        to: configuration.recipients,
        subject: `Novo cadastro: ${alert.fullName}`,
        text: `Um novo cadastro foi realizado na PIB Bady Bassitt.\n\nNome: ${alert.fullName}\nCategoria: ${category}\nCódigo da família: ${alert.familyCode}\n\nAcesse o painel administrativo para acompanhar o cadastro.`,
        html: `<div style="font-family:Arial,sans-serif;color:#173a5e;line-height:1.5"><h2>Novo cadastro recebido</h2><p>Um novo cadastro foi realizado na PIB Bady Bassitt.</p><p><strong>Nome:</strong> ${safeName}<br><strong>Categoria:</strong> ${category}<br><strong>Código da família:</strong> ${safeFamilyCode}</p><p>Acesse o painel administrativo para acompanhar o cadastro.</p></div>`,
      }),
    });

    if (!response.ok) {
      console.error(`[Email Alerts] O serviço de e-mail respondeu ${response.status}.`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email Alerts] Falha ao enviar alerta de novo cadastro:", error);
    return false;
  }
}
