import 'server-only';

const ADMIN_API_VERSION = '2026-07';
const SHOP_DOMAIN = 'xwn9c1-m8.myshopify.com';

export class ShopifyAdminError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ShopifyAdminError';
    this.statusCode = statusCode;
  }
}

export class AdminUserErrorsError extends Error {
  readonly userErrors: Array<{ field?: string[] | null; message: string }>;

  constructor(operation: string, userErrors: Array<{ field?: string[] | null; message: string }>) {
    super(`${operation} returned user errors`);
    this.name = 'AdminUserErrorsError';
    this.userErrors = userErrors;
  }
}

export function assertNoUserErrors(
  operation: string,
  userErrors: Array<{ field?: string[] | null; message: string }> | undefined,
) {
  if (userErrors && userErrors.length > 0) {
    throw new AdminUserErrorsError(operation, userErrors);
  }
}

export async function adminGraphql<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) {
    throw new ShopifyAdminError('SHOPIFY_ADMIN_ACCESS_TOKEN is not configured');
  }

  const response = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    console.error('[shopify-admin] request failed', { status: response.status });
    throw new ShopifyAdminError('Admin API request failed', response.status);
  }

  const payload = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };

  if (!payload.data) {
    console.error('[shopify-admin] empty response', {
      errorCount: payload.errors?.length ?? 0,
      firstError: payload.errors?.[0]?.message,
    });
    throw new ShopifyAdminError('Admin API returned no data');
  }

  return payload.data;
}
