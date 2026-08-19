import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_PARAM,
  MAINTENANCE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  isMaintenanceEnabled,
  isPathAlwaysAllowed,
  matchesBypassToken,
} from './src/lib/content/maintenance';

/**
 * Maintenance gate: while `MAINTENANCE_MODE` is on, every public route serves
 * the maintenance page with HTTP 503 so nothing of the storefront loads. See
 * `src/lib/content/maintenance.ts` for why the status code matters to SEO.
 *
 * Returns `null` when the request should carry on to the storefront.
 */
function maintenanceGate(request: NextRequest, requestHeaders: Headers): NextResponse | null {
  if (!isMaintenanceEnabled()) return null;

  const { pathname, searchParams } = request.nextUrl;
  if (isPathAlwaysAllowed(pathname)) return null;

  // `?preview=<token>` unlocks the site and remembers the choice in a cookie,
  // so the operator can click through the storefront while it is gated.
  const tokenFromQuery = searchParams.get(MAINTENANCE_BYPASS_PARAM);
  if (matchesBypassToken(tokenFromQuery)) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(MAINTENANCE_BYPASS_PARAM);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(MAINTENANCE_BYPASS_COOKIE, tokenFromQuery as string, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return response;
  }

  if (matchesBypassToken(request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value)) {
    return null;
  }

  return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), {
    request: { headers: requestHeaders },
    status: 503,
    headers: {
      'Retry-After': String(MAINTENANCE_RETRY_AFTER_SECONDS),
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}

const LEGACY_API_PATHS = [
  '/api/auth',
  '/api/events',
  '/api/internal/shopify',
  '/api/search/predictive',
  '/api/webhooks/square',
] as const;

/**
 * O painel e as APIs abaixo pertencem à 801 Outlet. Eles permanecem no
 * repositório somente como material de migração e não podem responder no
 * runtime da Balaio de Gato.
 */
function legacyRuntimeGate(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isLegacyApi = LEGACY_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isLegacyApi) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const legacyResponse = legacyRuntimeGate(request);
  if (legacyResponse) return legacyResponse;

  const gated = maintenanceGate(request, requestHeaders);
  if (gated) return gated;

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals, the crawler files and static
     * assets. `robots.txt` and `sitemap.xml` deliberately stay outside the
     * gate: a 503 on robots.txt makes Google pause crawling the whole site.
     * Asset requests are matched by extension, which also covers the files
     * the maintenance page itself needs (logo, fonts, styles).
     */
    '/((?!_next/static|_next/image|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|css|js|map|txt|xml|woff2?|ttf)$).*)',
  ],
};
