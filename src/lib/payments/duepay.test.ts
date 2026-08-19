import assert from 'node:assert/strict';
import test from 'node:test';

import { canTransitionDuepayPayment, createDuepayOrderReference } from './duepay';

test('builds a non-sensitive stable order reference', () => {
  assert.equal(
    createDuepayOrderReference({ orderSequence: 123, attempt: 2, year: 2026 }),
    'BG-2026-000123-A2',
  );
});

test('rejects invalid order reference inputs', () => {
  assert.throws(() => createDuepayOrderReference({ orderSequence: 0 }));
  assert.throws(() => createDuepayOrderReference({ orderSequence: 1, attempt: -1 }));
});

test('allows the documented manual payment flow', () => {
  assert.equal(canTransitionDuepayPayment('not_started', 'awaiting_link'), true);
  assert.equal(canTransitionDuepayPayment('awaiting_link', 'link_sent'), true);
  assert.equal(canTransitionDuepayPayment('link_sent', 'authorized'), true);
  assert.equal(canTransitionDuepayPayment('authorized', 'link_sent'), false);
});
