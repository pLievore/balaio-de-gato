import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoney } from './format';

test('formats Shopify money using its currency and significant cents', () => {
  assert.equal(formatMoney({ amount: '1540.0', currencyCode: 'USD' }), '$1,540');
  assert.equal(formatMoney({ amount: '1540.5', currencyCode: 'USD' }), '$1,540.50');
});

test('does not coerce an invalid Shopify amount into a false price', () => {
  assert.equal(formatMoney({ amount: 'not-a-number', currencyCode: 'USD' }), 'not-a-number');
});
