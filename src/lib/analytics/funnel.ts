import 'server-only';

/**
 * Contadores do funil do site (D-017).
 *
 * Guardados no PostgreSQL do projeto, em `funnel_counters`. Só existe contagem
 * agregada — um inteiro por dia, por dimensão —, nunca um identificador, IP ou
 * qualquer coisa ligada a uma pessoa. Por isso a loja não precisa de cookie de
 * rastreio nem de banner de consentimento.
 */

import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import { funnelCounters } from '../../db/schema';

export const FUNNEL_STEPS = ['session', 'product_view', 'add_to_cart', 'checkout_start'] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_STEP_LABEL: Record<FunnelStep | 'purchase', string> = {
  session: 'Visitas',
  product_view: 'Visualizações de produto',
  add_to_cart: 'Adições ao carrinho',
  checkout_start: 'Envios iniciados',
  purchase: 'Pedidos enviados',
};

export const TRAFFIC_SOURCES = [
  'instagram',
  'facebook',
  'google',
  'tiktok',
  'direct',
  'other',
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const TRAFFIC_SOURCE_LABEL: Record<TrafficSource, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  tiktok: 'TikTok',
  direct: 'Direct',
  other: 'Other',
};

/**
 * Buckets a referrer/UTM pair into a fixed set of sources. Only the bucket
 * name is ever stored — the raw referrer is discarded.
 */
export function classifyTrafficSource(referrer: string, utmSource: string): TrafficSource {
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    // No or invalid referrer.
  }
  const utm = utmSource.trim().toLowerCase();
  const haystack = `${utm} ${host}`;

  if (haystack.includes('instagram') || utm === 'ig') return 'instagram';
  if (haystack.includes('facebook') || /(^|\.)fb\.com$/.test(host) || utm === 'fb') {
    return 'facebook';
  }
  if (haystack.includes('tiktok')) return 'tiktok';
  if (haystack.includes('google')) return 'google';

  // Internal navigation opening in a new tab still counts as direct.
  if (host.endsWith('801outlet.com')) return 'direct';
  if (!host && !utm) return 'direct';
  return 'other';
}

/** Counters expire after ~13 months so the store never grows unbounded. */
/**
 * Armazenamento dos contadores, no PostgreSQL do projeto.
 *
 * Antes isto vivia num Redis Upstash que nunca foi provisionado — e por isso a
 * coleta ficava inerte: sem as variáveis, `/api/events` respondia 204 sem
 * gravar nada. Como o volume é de contadores diários e o banco já está de pé,
 * a tabela `funnel_counters` remove a dependência inteira.
 *
 * Nada aqui identifica o visitante: só existe "quantas vezes isto aconteceu
 * naquele dia".
 */

type Metric = 'step' | 'source' | 'location' | 'product';

/**
 * Soma 1 (ou mais) a vários contadores de uma vez.
 *
 * Um único INSERT com `on conflict` faz o incremento ser atômico e dispensa
 * ler antes de escrever, então dois beacons simultâneos não se perdem.
 */
async function bumpCounters(
  entries: readonly { metric: Metric; key: string; amount?: number }[],
): Promise<void> {
  if (entries.length === 0) return;

  const day = funnelDateKey();

  try {
    await db
      .insert(funnelCounters)
      .values(
        entries.map((entry) => ({
          day,
          metric: entry.metric,
          key: entry.key.slice(0, 140),
          total: entry.amount ?? 1,
        })),
      )
      .onConflictDoUpdate({
        target: [funnelCounters.day, funnelCounters.metric, funnelCounters.key],
        set: {
          total: sql`${funnelCounters.total} + excluded.total`,
          updatedAt: new Date(),
        },
      });
  } catch {
    // A medição é acessória: uma falha aqui não pode derrubar a navegação
    // nem o envio de um pedido. O beacon já responde 204 de qualquer forma.
  }
}

/** Datas do período, da mais antiga para a mais recente. */
function periodDates(days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    funnelDateKey(new Date(Date.now() - (days - 1 - index) * 86_400_000)),
  );
}

async function readCounters(
  metric: Metric,
  days: number,
): Promise<{ day: string; key: string; total: number }[]> {
  const dates = periodDates(days);
  const first = dates[0];
  if (!first) return [];

  try {
    return await db
      .select({ day: funnelCounters.day, key: funnelCounters.key, total: funnelCounters.total })
      .from(funnelCounters)
      .where(and(eq(funnelCounters.metric, metric), gte(funnelCounters.day, first)));
  } catch {
    return [];
  }
}

export function funnelDateKey(instant: Date = new Date(), timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export async function recordFunnelStep(step: FunnelStep): Promise<void> {
  await bumpCounters([{ metric: 'step', key: step }]);
}

/**
 * Per-session aggregate dimensions: traffic source bucket and coarse visitor
 * location (city/region from Vercel's edge headers). Stored as daily hash
 * counters — still no cookies, identifiers or per-visitor records.
 */
export async function recordSessionContext(context: {
  source: TrafficSource;
  location: string | null;
}): Promise<void> {
  await bumpCounters([
    { metric: 'source', key: context.source },
    ...(context.location ? [{ metric: 'location' as const, key: context.location }] : []),
  ]);
}

/**
 * Steps that can be attributed to a specific product. `session` cannot — it
 * happens before the visitor has looked at anything.
 */
export const PRODUCT_FUNNEL_STEPS = ['product_view', 'add_to_cart', 'checkout_start'] as const;

export type ProductFunnelStep = (typeof PRODUCT_FUNNEL_STEPS)[number];

export function isProductFunnelStep(step: string): step is ProductFunnelStep {
  return (PRODUCT_FUNNEL_STEPS as readonly string[]).includes(step);
}

/** O slug do produto é minúsculo, com dígitos e hífens. O resto é lixo. */
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** One beacon never carries more handles than a cart plausibly holds. */
const MAX_HANDLES_PER_EVENT = 20;

/**
 * Keeps the counters honest: only well-formed handles are stored, so a
 * crafted beacon cannot fill the table with arbitrary keys.
 */
export function sanitizeHandles(input: unknown): string[] {
  const list = Array.isArray(input) ? input : [input];
  const handles = new Set<string>();

  for (const entry of list) {
    if (typeof entry !== 'string') continue;
    const handle = entry.trim().toLowerCase();
    if (HANDLE_PATTERN.test(handle)) handles.add(handle);
    if (handles.size >= MAX_HANDLES_PER_EVENT) break;
  }

  return [...handles];
}

/**
 * Per-product step counters, as daily hashes keyed by handle. Same posture as
 * the rest of the funnel: counts only, nothing tied to a visitor.
 */
export async function recordProductStep(step: ProductFunnelStep, handles: string[]): Promise<void> {
  if (handles.length === 0) return;

  // A chave junta produto e etapa, para uma linha só servir as três colunas.
  await bumpCounters(handles.map((handle) => ({ metric: 'product', key: `${handle}:${step}` })));
}

export type ProductFunnelRow = {
  handle: string;
  counts: Record<ProductFunnelStep, number>;
};

/**
 * Per-product funnel for the last N days, busiest first. Answers the question
 * the operator actually asks: which sofas get looked at, which get added, and
 * which lose people on the way to checkout.
 */
export async function getProductFunnel(days: number, limit = 50): Promise<ProductFunnelRow[]> {
  const rows = new Map<string, ProductFunnelRow>();

  for (const counter of await readCounters('product', days)) {
    // A chave é `<slug>:<etapa>`; a etapa é o trecho após o último dois-pontos.
    const separator = counter.key.lastIndexOf(':');
    if (separator <= 0) continue;
    const handle = counter.key.slice(0, separator);
    const step = counter.key.slice(separator + 1);
    if (!isProductFunnelStep(step)) continue;

    const row =
      rows.get(handle) ??
      ({
        handle,
        counts: { product_view: 0, add_to_cart: 0, checkout_start: 0 },
      } satisfies ProductFunnelRow);
    row.counts[step] += counter.total;
    rows.set(handle, row);
  }

  return [...rows.values()]
    .sort((a, b) => b.counts.product_view - a.counts.product_view)
    .slice(0, limit);
}

export type BreakdownEntry = { label: string; count: number };

/**
 * Merged hash counters (sources or locations) for the last N days, sorted by
 * count, maior primeiro.
 */
export async function getFunnelBreakdown(
  days: number,
  kind: 'src' | 'geo',
  limit = 8,
): Promise<BreakdownEntry[]> {
  const totals = new Map<string, number>();

  for (const counter of await readCounters(kind === 'src' ? 'source' : 'location', days)) {
    totals.set(counter.key, (totals.get(counter.key) ?? 0) + counter.total);
  }

  return [...totals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type FunnelDailyRow = {
  date: string;
  counts: Record<FunnelStep, number>;
};

/** Daily counters for the last N days, oldest first. */
export async function getFunnelCounts(days: number): Promise<FunnelDailyRow[]> {
  const dates = periodDates(days);
  const counters = await readCounters('step', days);

  const byDay = new Map<string, Map<string, number>>();
  for (const counter of counters) {
    const day = byDay.get(counter.day) ?? new Map<string, number>();
    day.set(counter.key, (day.get(counter.key) ?? 0) + counter.total);
    byDay.set(counter.day, day);
  }

  // Todo dia do período aparece, mesmo zerado: o gráfico precisa da lacuna.
  return dates.map((date) => {
    const day = byDay.get(date);
    const counts = {} as Record<FunnelStep, number>;
    for (const step of FUNNEL_STEPS) counts[step] = day?.get(step) ?? 0;
    return { date, counts };
  });
}
