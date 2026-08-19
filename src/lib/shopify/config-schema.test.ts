import assert from 'node:assert/strict';
import test from 'node:test';

import { parseShopifyConfig, ShopifyConfigurationError } from './config-schema';

test('normalizes and accepts the pinned Shopify configuration', () => {
  const config = parseShopifyConfig({
    SHOPIFY_STORE_DOMAIN: 'https://801-outlet.myshopify.com/',
    SHOPIFY_STOREFRONT_API_VERSION: '2026-07',
    SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN: 'private-token',
  });

  assert.equal(config.storeDomain, 'https://801-outlet.myshopify.com');
  assert.equal(config.apiVersion, '2026-07');
  assert.equal(config.privateAccessToken, 'private-token');
});

test('reports invalid keys without including secret values', () => {
  const secret = 'private-token-that-must-not-leak';

  assert.throws(
    () =>
      parseShopifyConfig({
        SHOPIFY_STORE_DOMAIN: 'not-a-shopify-domain.example',
        SHOPIFY_STOREFRONT_API_VERSION: 'latest',
        SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN: secret,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ShopifyConfigurationError);
      assert.match(error.message, /SHOPIFY_STORE_DOMAIN/);
      assert.match(error.message, /SHOPIFY_STOREFRONT_API_VERSION/);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});
