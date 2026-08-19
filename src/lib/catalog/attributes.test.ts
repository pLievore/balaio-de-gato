import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PRODUCT_ATTRIBUTES, parseFeatures } from './attributes';

test('features are split one per line, ignoring blanks and padding', () => {
  assert.deepEqual(parseFeatures('Reversible chaise\n\n  Hidden storage  \nStain resistant\n'), [
    'Reversible chaise',
    'Hidden storage',
    'Stain resistant',
  ]);
});

test('an empty features value yields no items', () => {
  assert.deepEqual(parseFeatures(''), []);
  assert.deepEqual(parseFeatures('\n  \n'), []);
});

test('attribute keys are unique and safe as CSV column names', () => {
  const keys = PRODUCT_ATTRIBUTES.map((attribute) => attribute.key);

  assert.equal(new Set(keys).size, keys.length, 'duplicate attribute key');
  for (const key of keys) {
    assert.match(key, /^[a-z][a-z0-9_]*$/, `${key} is not a safe column name`);
  }
});
