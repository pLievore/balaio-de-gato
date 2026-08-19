import assert from 'node:assert/strict';
import test from 'node:test';

import { codeChallengeFromVerifier, generateRandomToken } from './pkce';

test('derives the RFC 7636 S256 code challenge', () => {
  // Appendix B of RFC 7636.
  assert.equal(
    codeChallengeFromVerifier('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

test('generates url-safe unique tokens', () => {
  const first = generateRandomToken();
  const second = generateRandomToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.ok(first.length >= 40);
});
