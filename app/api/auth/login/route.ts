import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

import {
  buildAuthorizationUrl,
  codeChallengeFromVerifier,
  generateRandomToken,
} from '../../../../src/lib/shopify/customer/oauth';
import { isCustomerAccountConfigured } from '../../../../src/lib/shopify/customer/config';

const FLOW_COOKIE_MAX_AGE_SECONDS = 600;

export async function GET(request: NextRequest) {
  if (!isCustomerAccountConfigured()) {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  const state = generateRandomToken();
  const nonce = generateRandomToken();
  const codeVerifier = generateRandomToken(48);

  const cookieStore = await cookies();
  const flowCookie = {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: FLOW_COOKIE_MAX_AGE_SECONDS,
  };
  cookieStore.set('customer_auth_state', state, flowCookie);
  cookieStore.set('customer_auth_verifier', codeVerifier, flowCookie);

  return NextResponse.redirect(
    buildAuthorizationUrl({
      redirectUri,
      state,
      nonce,
      codeChallenge: codeChallengeFromVerifier(codeVerifier),
    }),
  );
}
