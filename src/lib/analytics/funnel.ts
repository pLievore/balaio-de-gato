import 'server-only';

/**
 * Site funnel counters (D-017).
 *
 * Storage is a Redis instance provisioned through Vercel (Upstash). Only
 * aggregate counts are kept — one integer per day per step, never an
 * identifier, IP or anything tied to a person, so the storefront needs no
 * tracking cookie and no consent banner.
 */

export const FUNNEL_STEPS = ['session', 'product_view', 'add_to_cart', 'checkout_start'] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_STEP_LABEL: Record<FunnelStep | 'purchase', string> = {
  session: 'Visits',
  product_view: 'Product views',
  add_to_cart: 'Added to cart',
  checkout_start: 'Checkout started',
  purchase: 'Orders placed',
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
const COUNTER_TTL_SECONDS = 400 * 24 * 60 * 60;

type RedisConfig = { url: string; token: string };

function redisConfig(): RedisConfig | null {
  // Vercel's Upstash integration exposes KV_*; a direct Upstash project uses
  // UPSTASH_*. Accept either so provisioning either way just works.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '';
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  if (!url || !token) return null;
  return { url, token };
}

export function isFunnelStorageConfigured(): boolean {
  return redisConfig() !== null;
}

async function redisCommand<T>(command: string[]): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    throw new Error(`Redis command failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { result: T };
  return payload.result;
}

async function redisPipeline<T>(commands: string[][]): Promise<T[] | null> {
  const config = redisConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Redis pipeline failed with status ${response.status}`);
  }
  const payload = (await response.json()) as Array<{ result: T }>;
  return payload.map((entry) => entry.result);
}

/** YYYY-MM-DD in the store's timezone, matching the sales dashboards. */
export function funnelDateKey(instant: Date = new Date(), timeZone = 'America/Denver'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function counterKey(step: FunnelStep, date: string): string {
  return `funnel:${date}:${step}`;
}

export async function recordFunnelStep(step: FunnelStep): Promise<void> {
  const key = counterKey(step, funnelDateKey());
  await redisPipeline([
    ['INCR', key],
    ['EXPIRE', key, String(COUNTER_TTL_SECONDS)],
  ]);
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
  const date = funnelDateKey();
  const sourceKey = `funnel:src:${date}`;
  const commands: string[][] = [
    ['HINCRBY', sourceKey, context.source, '1'],
    ['EXPIRE', sourceKey, String(COUNTER_TTL_SECONDS)],
  ];
  if (context.location) {
    const geoKey = `funnel:geo:${date}`;
    commands.push(
      ['HINCRBY', geoKey, context.location, '1'],
      ['EXPIRE', geoKey, String(COUNTER_TTL_SECONDS)],
    );
  }
  await redisPipeline(commands);
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

/** Shopify handles are lowercase, digits and dashes. Anything else is junk. */
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** One beacon never carries more handles than a cart plausibly holds. */
const MAX_HANDLES_PER_EVENT = 20;

/**
 * Keeps the counters honest: only well-formed handles are stored, so a
 * crafted beacon cannot fill Redis with arbitrary field names.
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

  const key = `funnel:prod:${step}:${funnelDateKey()}`;
  const commands: string[][] = handles.map((handle) => ['HINCRBY', key, handle, '1']);
  commands.push(['EXPIRE', key, String(COUNTER_TTL_SECONDS)]);
  await redisPipeline(commands);
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
  const dates = Array.from({ length: days }, (_, index) =>
    funnelDateKey(new Date(Date.now() - (days - 1 - index) * 86400000)),
  );

  const commands = PRODUCT_FUNNEL_STEPS.flatMap((step) =>
    dates.map((date) => ['HGETALL', `funnel:prod:${step}:${date}`]),
  );
  const results = await redisPipeline<string[] | null>(commands);
  if (!results) return [];

  const rows = new Map<string, ProductFunnelRow>();

  results.forEach((flat, index) => {
    if (!Array.isArray(flat)) return;
    const step = PRODUCT_FUNNEL_STEPS[Math.floor(index / dates.length)];

    for (let cursor = 0; cursor + 1 < flat.length; cursor += 2) {
      const handle = flat[cursor];
      const count = Number(flat[cursor + 1]);
      if (!handle || !Number.isFinite(count)) continue;

      const row =
        rows.get(handle) ??
        ({
          handle,
          counts: { product_view: 0, add_to_cart: 0, checkout_start: 0 },
        } satisfies ProductFunnelRow);
      row.counts[step] += count;
      rows.set(handle, row);
    }
  });

  return [...rows.values()]
    .sort((a, b) => b.counts.product_view - a.counts.product_view)
    .slice(0, limit);
}

export type BreakdownEntry = { label: string; count: number };

/**
 * Merged hash counters (sources or locations) for the last N days, sorted by
 * count. Upstash returns HGETALL as a flat [field, value, ...] array.
 */
export async function getFunnelBreakdown(
  days: number,
  kind: 'src' | 'geo',
  limit = 8,
): Promise<BreakdownEntry[]> {
  const dates = Array.from({ length: days }, (_, index) =>
    funnelDateKey(new Date(Date.now() - (days - 1 - index) * 86400000)),
  );
  const results = await redisPipeline<string[] | null>(
    dates.map((date) => ['HGETALL', `funnel:${kind}:${date}`]),
  );
  if (!results) return [];

  const totals = new Map<string, number>();
  for (const flat of results) {
    if (!Array.isArray(flat)) continue;
    for (let index = 0; index + 1 < flat.length; index += 2) {
      const label = flat[index];
      const count = Number(flat[index + 1]);
      if (!label || !Number.isFinite(count)) continue;
      totals.set(label, (totals.get(label) ?? 0) + count);
    }
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
  const dates = Array.from({ length: days }, (_, index) =>
    funnelDateKey(new Date(Date.now() - (days - 1 - index) * 86400000)),
  );

  const keys = dates.flatMap((date) => FUNNEL_STEPS.map((step) => counterKey(step, date)));
  if (keys.length === 0) return [];

  const values = await redisCommand<Array<string | null>>(['MGET', ...keys]);
  if (!values) return [];

  return dates.map((date, dayIndex) => {
    const counts = {} as Record<FunnelStep, number>;
    FUNNEL_STEPS.forEach((step, stepIndex) => {
      const raw = values[dayIndex * FUNNEL_STEPS.length + stepIndex];
      counts[step] = raw ? Number(raw) : 0;
    });
    return { date, counts };
  });
}
