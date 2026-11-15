// Envia emails pela API HTTP do Brevo (o Render grátis bloqueia SMTP).
// Variáveis: BREVO_API_KEY e EMAIL_FROM (remetente confirmado no Brevo).
// Sem a chave (desenvolvimento), só mostra o email no terminal.

interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      `[email] BREVO_API_KEY/EMAIL_FROM não configurados. Email para ${message.to}:\n` +
        `  ${message.subject}\n  ${message.text.replace(/\n/g, "\n  ")}`,
    );
    return;
  }

  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from, name: process.env.EMAIL_FROM_NAME || "TypeBattle" },
      to: [{ email: message.to, ...(message.toName ? { name: message.toName } : {}) }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Brevo respondeu ${response.status}: ${detail.slice(0, 300)}`);
  }
}
