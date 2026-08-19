/**
 * Regras e aritmética do limite de requisições.
 *
 * Separado de `rate-limit.ts` porque não toca no banco: é a parte que dá para
 * testar direto, sem subir conexão nenhuma.
 *
 * O identificador (normalmente o endereço IP) nunca é gravado — vira um
 * índice irreversível por HMAC antes de chegar ao banco.
 */

import { createHash, createHmac } from 'node:crypto';

export type RateLimitRule = {
  /** Quantas requisições a janela aceita. */
  readonly limit: number;
  /** Tamanho da janela, em segundos. */
  readonly windowSeconds: number;
};

export type RateLimitVerdict = {
  readonly allowed: boolean;
  /** Quantas requisições ainda cabem na janela atual. */
  readonly remaining: number;
  /** Segundos até a janela virar. Zero quando ainda há folga. */
  readonly retryAfterSeconds: number;
};

/** Regras nomeadas, num lugar só, para que os números sejam revisáveis. */
export const RATE_LIMITS = {
  /** Envio de pedido: uma família não faz dez pedidos em cinco minutos. */
  checkout: { limit: 8, windowSeconds: 300 },
  /** Beacon de funil: uma sessão real manda poucas dezenas de eventos. */
  events: { limit: 120, windowSeconds: 60 },
  /** Senha do painel: dez tentativas por dez minutos. */
  panelLogin: { limit: 10, windowSeconds: 600 },
  /** Consulta de pedido por código: fecha a porta para varredura de códigos. */
  orderLookup: { limit: 20, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitScope = keyof typeof RATE_LIMITS;

function bucketSecret(): string {
  return (
    process.env.ORDER_DATA_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_PANEL_SESSION_SECRET?.trim() ||
    // Sem segredo configurado o limite ainda funciona; o que se perde é a
    // proteção contra reverter o endereço a partir do banco.
    'balaio-de-gato:rate-limit:fallback'
  );
}

/** Índice irreversível do identificador dentro de um escopo. */
export function rateLimitBucket(scope: string, identifier: string): string {
  return createHmac('sha256', bucketSecret())
    .update(`balaio-de-gato:rate-limit:${scope}:${identifier}`)
    .digest('hex');
}

/**
 * Início da janela que contém `now`.
 *
 * Janelas alinhadas ao relógio (e não ao primeiro acesso) mantêm a chave
 * primária estável entre instâncias concorrentes, que é o que faz o upsert
 * somar em vez de criar linhas paralelas.
 */
export function windowStartFor(now: Date, windowSeconds: number): Date {
  const size = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / size) * size);
}

export function secondsUntilNextWindow(now: Date, windowSeconds: number): number {
  const start = windowStartFor(now, windowSeconds).getTime();
  return Math.max(1, Math.ceil((start + windowSeconds * 1000 - now.getTime()) / 1000));
}

/**
 * Quem está pedindo, para efeito de limite.
 *
 * Prefere o endereço que a Vercel coloca em `x-forwarded-for`. Sem ele — em
 * desenvolvimento, por exemplo — cai num balde único, que ainda limita o
 * volume total sem distinguir origem.
 */
export function requestIdentifier(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  const address = first || headers.get('x-real-ip')?.trim() || '';
  if (address) return address;

  // Sem endereço, o agente ao menos separa robôs distintos.
  const agent = headers.get('user-agent') ?? '';
  return agent ? `ua:${createHash('sha256').update(agent).digest('hex').slice(0, 32)}` : 'anonymous';
}
