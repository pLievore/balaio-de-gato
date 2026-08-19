import 'server-only';

/**
 * Envio de e-mail transacional.
 *
 * Fala com a API da Resend por HTTP puro — nenhuma dependência nova para uma
 * chamada de um POST. Se as variáveis não estiverem configuradas, o envio é
 * ignorado e devolve `skipped`: o pedido nunca falha porque o e-mail falhou,
 * mas quem chama consegue saber que não foi enviado, em vez de supor que foi.
 *
 * Nada aqui lança. Um pedido gravado com e-mail não enviado é recuperável
 * pelo painel; um pedido perdido porque o provedor estava fora, não.
 */

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

export type EmailOutcome =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
};

function apiKey(): string {
  return process.env.RESEND_API_KEY?.trim() ?? '';
}

function sender(): string {
  return process.env.EMAIL_FROM?.trim() ?? '';
}

/**
 * Se o envio está de pé.
 *
 * A interface consulta isto antes de prometer e-mail ao cliente. Prometer o
 * que não sai é pior que não prometer nada.
 */
export function isEmailConfigured(): boolean {
  return apiKey().length > 0 && sender().length > 0;
}

export async function sendEmail(message: EmailMessage): Promise<EmailOutcome> {
  if (!isEmailConfigured()) {
    return { status: 'skipped', reason: 'RESEND_API_KEY ou EMAIL_FROM não configurados.' };
  }

  const payload: Record<string, unknown> = {
    from: sender(),
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  if (replyTo) payload.reply_to = replyTo;

  try {
    // Sem timeout, um provedor lento seguraria o Server Action do checkout
    // até o limite da função — o cliente veria o pedido travar.
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { status: 'failed', reason: `HTTP ${response.status} ${detail.slice(0, 200)}`.trim() };
    }

    const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
    return { status: 'sent', id: typeof body?.id === 'string' ? body.id : null };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Falha desconhecida no envio.',
    };
  }
}
