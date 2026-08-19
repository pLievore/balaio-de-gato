import assert from 'node:assert/strict';
import test from 'node:test';

import {
  revalidationTagsFor,
  shopifyRevalidationSignalSchema,
  verifyRevalidationSecret,
} from './revalidation';

test('compares revalidation secrets in constant time with a minimum length', () => {
  const secret = 'a'.repeat(32);
  assert.equal(verifyRevalidationSecret(secret, secret), true);
  assert.equal(verifyRevalidationSecret('b'.repeat(32), secret), false);
  assert.equal(verifyRevalidationSecret('short', 'short'), false);
});

test('accepts only supported topics and safe Shopify handles', () => {
  assert.equal(
    shopifyRevalidationSignalSchema.safeParse({
      topic: 'products/update',
      handle: 'navy-sofa',
      webhookId: 'delivery-1',
    }).success,
    true,
  );
  assert.equal(
    shopifyRevalidationSignalSchema.safeParse({
      topic: 'orders/create',
      handle: '../unsafe',
    }).success,
    false,
  );
});

test('maps minimal signals to broad and handle-specific cache tags', () => {
  assert.deepEqual(
    revalidationTagsFor({
      topic: 'products/update',
      handle: 'navy-sofa',
    }),
    ['shopify', 'shopify:products', 'shopify:products:navy-sofa'],
  );
  assert.deepEqual(revalidationTagsFor({ topic: 'collections/update', handle: 'frontpage' }), [
    'shopify',
    'shopify:collections',
    'shopify:products',
    'shopify:collections:frontpage',
  ]);
});
