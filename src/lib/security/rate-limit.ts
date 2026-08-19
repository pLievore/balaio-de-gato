import 'server-only';

import { and, eq, lt, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import { rateLimitCounters } from '../../db/schema';
import {
  RATE_LIMITS,
  rateLimitBucket,
  secondsUntilNextWindow,
  windowStartFor,
  type RateLimitScope,
  type RateLimitVerdict,
} from './rate-limit-rules';

/**
 * Limite de requisições por janela fixa, com contagem no banco.
 *
 * O site roda em funções serverless: um contador em memória só limita quem
 * cair na mesma instância quente, o que na prática não limita ninguém. A
 * contagem mora no Postgres para valer para todas as instâncias.
 *
 * As regras e a aritmética estão em `rate-limit-rules.ts`; aqui fica só o
 * que precisa de conexão.
 */

export { RATE_LIMITS, requestIdentifier } from './rate-limit-rules';
export type { RateLimitScope, RateLimitVerdict } from './rate-limit-rules';

/**
 * Registra uma requisição e diz se ela passa.
 *
 * Falha aberta de propósito: se o banco estiver fora, a loja continua
 * atendendo. Um limite indisponível é um problema menor que um checkout
 * indisponível — e o banco fora já derruba o checkout por outros motivos.
 */
export async function consumeRateLimit(
  scope: RateLimitScope,
  identifier: string,
  now: Date = new Date(),
): Promise<RateLimitVerdict> {
  const rule = RATE_LIMITS[scope];
  const windowStart = windowStartFor(now, rule.windowSeconds);

  try {
    const [row] = await db
      .insert(rateLimitCounters)
      .values({
        scope,
        bucket: rateLimitBucket(scope, identifier),
        windowStart,
        hits: 1,
      })
      .onConflictDoUpdate({
        target: [rateLimitCounters.scope, rateLimitCounters.bucket, rateLimitCounters.windowStart],
        set: {
          hits: sql`${rateLimitCounters.hits} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ hits: rateLimitCounters.hits });

    const hits = row?.hits ?? 1;
    void sweepExpiredWindows(now);

    return {
      allowed: hits <= rule.limit,
      remaining: Math.max(0, rule.limit - hits),
      retryAfterSeconds: hits <= rule.limit ? 0 : secondsUntilNextWindow(now, rule.windowSeconds),
    };
  } catch {
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/**
 * Limpa janelas vencidas de vez em quando.
 *
 * Rodar em toda requisição seria desperdício; um sorteio a cada cinquenta
 * chamadas basta para a tabela não crescer sem limite, e dispensa cron.
 */
async function sweepExpiredWindows(now: Date): Promise<void> {
  if (Math.random() > 0.02) return;
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    await db.delete(rateLimitCounters).where(lt(rateLimitCounters.windowStart, cutoff));
  } catch {
    // A limpeza é oportunista; falhar aqui não pode afetar a requisição.
  }
}

/** Zera a contagem — usada depois de um acerto legítimo, como o login correto. */
export async function clearRateLimit(scope: RateLimitScope, identifier: string): Promise<void> {
  try {
    await db
      .delete(rateLimitCounters)
      .where(
        and(
          eq(rateLimitCounters.scope, scope),
          eq(rateLimitCounters.bucket, rateLimitBucket(scope, identifier)),
        ),
      );
  } catch {
    // Idem: melhor manter a contagem do que quebrar o fluxo.
  }
}
