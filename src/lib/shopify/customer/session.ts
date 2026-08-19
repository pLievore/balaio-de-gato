import 'server-only';

import { cookies } from 'next/headers';

import { refreshCustomerTokens, type CustomerTokens } from './oauth';

const ACCESS_COOKIE = 'customer_access_token';
const REFRESH_COOKIE = 'customer_refresh_token';
const EXPIRES_COOKIE = 'customer_token_expires_at';
const ID_TOKEN_COOKIE = 'customer_id_token';

/** Refresh the access token when it expires within this window. */
const REFRESH_SKEW_MS = 60_000;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function persistCustomerSession(tokens: CustomerTokens) {
  const cookieStore = await cookies();
  const accessMaxAge = Math.max(60, Math.floor((tokens.expiresAt - Date.now()) / 1000));

  cookieStore.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(accessMaxAge));
  cookieStore.set(EXPIRES_COOKIE, String(tokens.expiresAt), cookieOptions(accessMaxAge));
  cookieStore.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
  );
  if (tokens.idToken) {
    cookieStore.set(ID_TOKEN_COOKIE, tokens.idToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EXPIRES_COOKIE, ID_TOKEN_COOKIE]) {
    cookieStore.delete(name);
  }
}

export async function getCustomerIdToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ID_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Returns a valid customer access token, refreshing it when close to expiry.
 * Reading is safe anywhere; refreshing rotates cookies and therefore only
 * happens where cookies are writable (server actions / route handlers) —
 * pass `allowRefresh: false` from server components.
 */
export async function getCustomerAccessToken({
  allowRefresh = true,
}: { allowRefresh?: boolean } = {}): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const expiresAt = Number(cookieStore.get(EXPIRES_COOKIE)?.value ?? 0);
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const stillValid = Boolean(accessToken) && Date.now() < expiresAt - REFRESH_SKEW_MS;
  if (stillValid) return accessToken ?? null;

  if (!refreshToken || !allowRefresh) return null;

  const refreshed = await refreshCustomerTokens(refreshToken);
  if (!refreshed) return null;

  await persistCustomerSession(refreshed);
  return refreshed.accessToken;
}

export async function isCustomerSignedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(REFRESH_COOKIE)?.value);
}
