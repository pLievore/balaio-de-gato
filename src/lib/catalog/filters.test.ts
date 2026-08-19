import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProductQuery,
  normalizeCatalogSearch,
  normalizePriceRange,
  parseCatalogAvailability,
  parseCatalogPrice,
  parseCatalogSort,
} from './filters';

test('normalizes catalog query parameters without accepting arbitrary syntax', () => {
  assert.equal(normalizeCatalogSearch('  navy   sofa:*  '), 'navy sofa');
  assert.equal(parseCatalogSort('price_desc'), 'price_desc');
  assert.equal(parseCatalogSort('invalid'), 'featured');
  assert.equal(parseCatalogAvailability('available'), 'available');
  assert.equal(parseCatalogAvailability('false'), 'all');
  assert.equal(parseCatalogPrice('1540.509'), 1540.51);
  assert.equal(parseCatalogPrice('-1'), undefined);
});

test('builds only supported Shopify product filters', () => {
  assert.equal(
    buildProductQuery({
      availability: 'available',
      minPrice: 500,
      maxPrice: 1800,
    }),
    'available_for_sale:true AND variants.price:>=500.00 AND variants.price:<=1800.00',
  );
  assert.equal(buildProductQuery({ availability: 'all' }), undefined);
  assert.deepEqual(normalizePriceRange(1800, 500), {
    minPrice: 500,
    maxPrice: 1800,
  });
});
