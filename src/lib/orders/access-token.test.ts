import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACCESS_TOKEN_LENGTH,
  accessTokenExpiry,
  accessTokenHashMatches,
  generateAccessToken,
  hashAccessToken,
  isAccessToken,
  normalizeAccessToken,
  orderTrackingPath,
} from './access-token';

test('a chave tem o comprimento declarado', () => {
  assert.equal(generateAccessToken().length, ACCESS_TOKEN_LENGTH);
});

test('a chave não usa caracteres que se confundem lidos em voz alta', () => {
  // 0/O, 1/I/L e U/V ficam de fora: a chave pode ser ditada no atendimento.
  const proibidos = /[01ILOUV]/;
  for (let i = 0; i < 200; i += 1) {
    assert.ok(!proibidos.test(generateAccessToken()), 'sorteou caractere ambíguo');
  }
});

test('duas chaves seguidas não se repetem', () => {
  const geradas = new Set(Array.from({ length: 500 }, () => generateAccessToken()));
  assert.equal(geradas.size, 500);
});

test('aceita a chave colada com espaço, quebra de linha e caixa trocada', () => {
  const token = generateAccessToken();
  const sujo = `  ${token.slice(0, 8)}\n${token.slice(8).toLowerCase()} `;
  assert.equal(normalizeAccessToken(sujo), token);
});

test('reconhece a chave válida e recusa o que não é', () => {
  assert.ok(isAccessToken(generateAccessToken()));
  assert.ok(!isAccessToken(''));
  assert.ok(!isAccessToken('CURTA'));
  // Comprimento certo, alfabeto errado.
  assert.ok(!isAccessToken('0'.repeat(ACCESS_TOKEN_LENGTH)));
});

test('o resumo cabe na coluna: 64 hexadecimais', () => {
  assert.match(hashAccessToken(generateAccessToken()), /^[0-9a-f]{64}$/);
});

test('o resumo não deixa a chave aparecer', () => {
  const token = generateAccessToken();
  assert.ok(!hashAccessToken(token).includes(token.toLowerCase()));
});

test('o mesmo texto dá o mesmo resumo e textos diferentes não colidem', () => {
  const a = generateAccessToken();
  const b = generateAccessToken();
  assert.equal(hashAccessToken(a), hashAccessToken(a));
  assert.notEqual(hashAccessToken(a), hashAccessToken(b));
});

test('a comparação aceita o par certo e recusa o errado sem estourar', () => {
  const resumo = hashAccessToken(generateAccessToken());
  assert.ok(accessTokenHashMatches(resumo, resumo));
  assert.ok(!accessTokenHashMatches(resumo, hashAccessToken(generateAccessToken())));
  // Comprimentos diferentes não podem quebrar timingSafeEqual.
  assert.ok(!accessTokenHashMatches(resumo, 'curto'));
});

test('o endereço de acompanhamento leva a chave e escapa o que precisa', () => {
  const token = generateAccessToken();
  assert.equal(orderTrackingPath('BG-ABC123', token), `/pedido/BG-ABC123?t=${token}`);
});

test('sem chave, o endereço continua válido — só mostra menos', () => {
  assert.equal(orderTrackingPath('BG-ABC123'), '/pedido/BG-ABC123');
  assert.equal(orderTrackingPath('BG-ABC123', null), '/pedido/BG-ABC123');
});

test('a validade fica no futuro, como a restrição da tabela exige', () => {
  const agora = new Date('2026-03-10T12:00:00Z');
  assert.ok(accessTokenExpiry(agora).getTime() > agora.getTime());
});
