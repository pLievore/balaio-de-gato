import { NextResponse, type NextRequest } from 'next/server';

import { getCustomerAccessToken } from '../../../../src/lib/shopify/customer/session';

/**
 * Server components cannot rotate cookies; they redirect here when the access
 * token is stale. This handler refreshes the session and sends the customer
 * back (or to /login when the refresh token no longer works).
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/account';
  // Only allow same-site relative paths to avoid open redirects.
  const nextPath =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/account';

  const accessToken = await getCustomerAccessToken();
  return NextResponse.redirect(new URL(accessToken ? nextPath : '/login', origin));
}
