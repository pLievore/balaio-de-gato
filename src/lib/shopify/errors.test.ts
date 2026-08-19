import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeGraphQLErrors, ShopifyStorefrontError } from './errors';

test('normalizes GraphQL messages and unknown error shapes', () => {
  assert.deepEqual(normalizeGraphQLErrors([{ message: 'Invalid query' }, { unexpected: true }]), [
    'Invalid query',
    'Unknown Shopify GraphQL error',
  ]);
});

test('serializes only operationally safe error details', () => {
  const error = new ShopifyStorefrontError({
    code: 'GRAPHQL_ERROR',
    operationName: 'Products',
    message: 'Shopify returned GraphQL errors.',
    graphQLErrors: ['Invalid field'],
    hasPartialData: true,
  });

  assert.deepEqual(error.toJSON(), {
    name: 'ShopifyStorefrontError',
    code: 'GRAPHQL_ERROR',
    operationName: 'Products',
    statusCode: undefined,
    graphQLErrorCount: 1,
    hasPartialData: true,
    retryable: false,
  });
  assert.equal('cause' in error.toJSON(), false);
});
