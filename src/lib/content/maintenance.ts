/**
 * Maintenance mode.
 *
 * When enabled, `proxy.ts` serves the maintenance page for every public route
 * with HTTP 503 instead of letting the storefront render. 503 is deliberate:
 * it tells search engines the outage is temporary, so pages keep their index
 * entries and rankings and Google simply reschedules the crawl. Serving 200
 * with a maintenance overlay would instead get every URL reindexed with the
 * same placeholder content. For the same reason the page carries no `noindex`
 * — that is what actually deindexes a site.
 *
 * Long outages are the exception: after a few weeks Google starts treating a
 * persistent 503 as permanent and drops the URLs.
 */

/** Route rendered while the gate is on. */
export const MAINTENANCE_PATH = '/maintenance';

/** Hint for crawlers and CDNs on when to come back (1 hour). */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

/** Query parameter that unlocks the real site for the operator. */
export const MAINTENANCE_BYPASS_PARAM = 'preview';

/** Cookie that keeps the bypass alive across navigation, for the session. */
export const MAINTENANCE_BYPASS_COOKIE = 'maintenance_bypass';

/**
 * Caminhos que continuam acessíveis com o portão ligado:
 * - o painel, para a loja seguir sendo operada durante a manutenção;
 * - a própria página de manutenção, senão a reescrita entraria em laço.
 */
const ALWAYS_ALLOWED_PREFIXES = ['/admin', MAINTENANCE_PATH];

/**
 * Read at build time and inlined into the edge bundle, so flipping this in
 * Vercel takes effect on the next deploy. Accepts the usual truthy spellings.
 */
export function isMaintenanceEnabled(): boolean {
  const flag = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'on';
}

export function isPathAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Bypass token for previewing the live site while the gate is on. This is a
 * convenience, not a security boundary — the admin panel keeps its own auth.
 * With no token configured the bypass is simply unavailable.
 */
export function matchesBypassToken(value: string | undefined | null): boolean {
  const expected = process.env.MAINTENANCE_BYPASS_TOKEN?.trim();
  if (!expected || !value) return false;
  return value === expected;
}
