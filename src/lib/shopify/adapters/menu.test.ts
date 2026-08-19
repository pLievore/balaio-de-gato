import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeShopifyMenuUrl, withDeliveryLink } from './menu';

function link(href: string, label: string) {
  return { id: `test-${label}`, label, href, external: false, children: [] };
}

test('maps Online Store menu destinations to headless routes', () => {
  assert.deepEqual(normalizeShopifyMenuUrl('https://801outlet.com/collections/all', 'CATALOG'), {
    href: '/products',
    external: false,
  });
  assert.deepEqual(normalizeShopifyMenuUrl('https://801outlet.com/pages/contact', 'PAGE'), {
    href: '/contact',
    external: false,
  });
  assert.deepEqual(
    normalizeShopifyMenuUrl('https://801outlet.com/pages/test-showroom-booking', 'PAGE'),
    { href: '/showroom', external: false },
  );
});

test('rewrites links built on the checkout-only store domains', () => {
  // Shopify emits menu URLs on the primary domain, now shop.801outlet.com.
  assert.deepEqual(
    normalizeShopifyMenuUrl('https://shop.801outlet.com/pages/test-showroom-booking', 'PAGE'),
    { href: '/showroom', external: false },
  );
  assert.deepEqual(
    normalizeShopifyMenuUrl('https://xwn9c1-m8.myshopify.com/pages/contact', 'PAGE'),
    { href: '/contact', external: false },
  );
  assert.deepEqual(
    normalizeShopifyMenuUrl('https://shop.801outlet.com/collections/sofas', 'COLLECTION'),
    { href: '/collections/sofas', external: false },
  );
});

test('preserves external menu destinations explicitly', () => {
  assert.deepEqual(normalizeShopifyMenuUrl('https://example.com/help', 'HTTP'), {
    href: 'https://example.com/help',
    external: true,
  });
});

test('inserts the Delivery link after Contact', () => {
  const menu = [
    link('/', 'Home'),
    link('/products', 'Catalog'),
    link('/contact', 'Contact'),
    link('/showroom', 'Schedule Appointment'),
  ];

  assert.deepEqual(
    withDeliveryLink(menu).map((item) => item.href),
    ['/', '/products', '/contact', '/delivery', '/showroom'],
  );
});

test('does not duplicate an existing Delivery link', () => {
  const menu = [link('/delivery', 'Delivery'), link('/contact', 'Contact')];
  assert.deepEqual(withDeliveryLink(menu), menu);
});

test('falls back to before the showroom link, then to the end', () => {
  assert.deepEqual(
    withDeliveryLink([link('/', 'Home'), link('/showroom', 'Showroom')]).map((item) => item.href),
    ['/', '/delivery', '/showroom'],
  );
  assert.deepEqual(
    withDeliveryLink([link('/', 'Home')]).map((item) => item.href),
    ['/', '/delivery'],
  );
});
