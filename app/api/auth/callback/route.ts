import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';

import { exchangeCodeForTokens } from '../../../../src/lib/shopify/customer/oauth';
import { persistCustomerSession } from '../../../../src/lib/shopify/customer/session';
import { updateCartBuyerIdentity } from '../../../../src/lib/shopify/queries/cart';

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const failure = NextResponse.redirect(new URL('/login?error=auth', origin));

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('customer_auth_state')?.value;
  const codeVerifier = cookieStore.get('customer_auth_verifier')?.value;
  cookieStore.delete('customer_auth_state');
  cookieStore.delete('customer_auth_verifier');

  if (!code || !state || !expectedState || !codeVerifier) return failure;
  if (!safeEqual(state, expectedState)) return failure;

  const tokens = await exchangeCodeForTokens({
    code,
    codeVerifier,
    redirectUri: `${origin}/api/auth/callback`,
  });

  if (!tokens) return failure;

  await persistCustomerSession(tokens);

  // Attach any existing cart to the signed-in customer (best-effort).
  const cartId = cookieStore.get('shopify_cart_id')?.value;
  if (cartId) {
    try {
      await updateCartBuyerIdentity(cartId, tokens.accessToken);
    } catch {
      // Sign-in succeeds even if the cart association fails.
    }
  }

  return NextResponse.redirect(new URL('/account', origin));
}
