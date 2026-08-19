import 'server-only';

import { getCustomerAccountConfig } from './config';

const SCOPES = 'openid email customer-account-api:full';

export { codeChallengeFromVerifier, generateRandomToken } from './pkce';

export function buildAuthorizationUrl({
  redirectUri,
  state,
  codeChallenge,
  nonce,
}: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  nonce: string;
}): string {
  const config = getCustomerAccountConfig();
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export type CustomerTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
};

async function requestTokens(body: URLSearchParams): Promise<CustomerTokens | null> {
  const config = getCustomerAccountConfig();

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await response.json().catch(() => null)) as TokenResponse | null;

  if (!response.ok || !data?.access_token || !data.refresh_token) {
    console.error('[customer-auth] token request failed', {
      status: response.status,
      error: data?.error ?? 'unknown',
    });
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token ?? null,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
  };
}

export async function exchangeCodeForTokens({
  code,
  codeVerifier,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<CustomerTokens | null> {
  const config = getCustomerAccountConfig();

  return requestTokens(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  );
}

export async function refreshCustomerTokens(refreshToken: string): Promise<CustomerTokens | null> {
  const config = getCustomerAccountConfig();

  return requestTokens(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    }),
  );
}

export function buildLogoutUrl(idToken: string, postLogoutRedirectUri: string) {
  const config = getCustomerAccountConfig();
  const url = new URL(config.logoutUrl);
  url.searchParams.set('id_token_hint', idToken);
  url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  return url.toString();
}
