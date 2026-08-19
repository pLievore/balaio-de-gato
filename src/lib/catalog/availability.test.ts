import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAvailability } from './availability';

test('an available product is in stock and purchasable', () => {
  const availability = getAvailability({ availableForSale: true, tags: [] });

  assert.equal(availability.state, 'in-stock');
  assert.equal(availability.label, 'In stock');
  assert.equal(availability.purchasable, true);
});

test('an unavailable product without tags reads as sold out', () => {
  const availability = getAvailability({ availableForSale: false, tags: [] });

  assert.equal(availability.state, 'sold-out');
  assert.equal(availability.label, 'Sold out');
  assert.equal(availability.purchasable, false);
});

test('the coming-soon tag only applies while the product is out of stock', () => {
  const outOfStock = getAvailability({
    availableForSale: false,
    tags: ['sectional', 'coming-soon'],
  });
  assert.equal(outOfStock.state, 'coming-soon');
  assert.equal(outOfStock.purchasable, false);

  // Real stock wins: we sell it rather than hiding it behind the label.
  const restocked = getAvailability({
    availableForSale: true,
    tags: ['coming-soon'],
  });
  assert.equal(restocked.state, 'in-stock');
  assert.equal(restocked.purchasable, true);
});

test('the tag is matched regardless of casing, spacing or separator', () => {
  for (const tag of ['Coming Soon', 'COMING-SOON', 'coming_soon', ' coming soon ']) {
    assert.equal(
      getAvailability({ availableForSale: false, tags: [tag] }).state,
      'coming-soon',
      `expected ${JSON.stringify(tag)} to mark the product as coming soon`,
    );
  }
});

test('unrelated tags never change the state', () => {
  assert.equal(
    getAvailability({ availableForSale: false, tags: ['soon', 'coming'] }).state,
    'sold-out',
  );
});

test('missing tags are tolerated', () => {
  assert.equal(getAvailability({ availableForSale: false }).state, 'sold-out');
});
