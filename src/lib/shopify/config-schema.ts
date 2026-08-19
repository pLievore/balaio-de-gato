import { z } from 'zod';

import { SHOPIFY_STOREFRONT_API_VERSION } from './constants';

const myShopifyDomainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

const shopifyEnvironmentSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '')
        .toLowerCase(),
    )
    .pipe(z.string().regex(myShopifyDomainPattern)),
  SHOPIFY_STOREFRONT_API_VERSION: z.literal(SHOPIFY_STOREFRONT_API_VERSION),
  SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN: z.string().trim().min(1),
});

export type ShopifyConfig = {
  storeDomain: string;
  apiVersion: typeof SHOPIFY_STOREFRONT_API_VERSION;
  privateAccessToken: string;
};

export class ShopifyConfigurationError extends Error {
  readonly keys: string[];

  constructor(keys: string[]) {
    super(`Invalid Shopify server configuration: ${keys.join(', ')}`);
    this.name = 'ShopifyConfigurationError';
    this.keys = keys;
  }
}

export function parseShopifyConfig(source: Record<string, string | undefined>): ShopifyConfig {
  const result = shopifyEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const keys = [
      ...new Set(
        result.error.issues.map((issue) =>
          issue.path.length > 0 ? String(issue.path[0]) : 'unknown',
        ),
      ),
    ];

    throw new ShopifyConfigurationError(keys);
  }

  return {
    storeDomain: `https://${result.data.SHOPIFY_STORE_DOMAIN}`,
    apiVersion: result.data.SHOPIFY_STOREFRONT_API_VERSION,
    privateAccessToken: result.data.SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN,
  };
}
