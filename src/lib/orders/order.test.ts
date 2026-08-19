import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildOrderItems, generateOrderCode, isOrderCode } from './order';

const PRODUTOS = [
  { slug: 'caderno', sku: 'CAD-1', name: 'Caderno', brand: 'Tilibra', priceInCents: 1490 },
  { slug: 'lapis', sku: 'LAP-1', name: 'Lápis', brand: 'Faber', priceInCents: 1990 },
];

test('o código tem o prefixo da loja e seis caracteres', () => {
  const code = generateOrderCode();
  assert.match(code, /^BG-[A-Z0-9]{6}$/);
  assert.equal(isOrderCode(code), true);
});

test('o alfabeto do código evita os caracteres que se confundem ao ditar', () => {
  // Mil códigos são amostra suficiente para pegar qualquer um dos quatro.
  for (let i = 0; i < 1000; i += 1) {
    const code = generateOrderCode().slice(3);
    for (const proibido of ['I', 'O', '0', '1']) {
      assert.ok(!code.includes(proibido), `${code} contém "${proibido}"`);
    }
  }
});

test('reconhece o código digitado em minúsculas', () => {
  assert.equal(isOrderCode('bg-abc234'), true);
});

test('recusa formato de código inválido', () => {
  assert.equal(isOrderCode('BG-ABC23'), false); // curto demais
  assert.equal(isOrderCode('XX-ABC234'), false); // prefixo errado
  assert.equal(isOrderCode('BG-ABCI34'), false); // usa letra fora do alfabeto
  assert.equal(isOrderCode(''), false);
});

test('monta os itens com o preço do catálogo, não com o que veio do cliente', () => {
  const items = buildOrderItems([{ slug: 'caderno', quantity: 3 }], PRODUTOS);

  assert.equal(items.length, 1);
  assert.equal(items[0]?.unitPriceInCents, 1490);
  assert.equal(items[0]?.lineTotalInCents, 4470);
  assert.equal(items[0]?.sku, 'CAD-1');
});

test('descarta linha cujo produto não existe mais', () => {
  const items = buildOrderItems(
    [
      { slug: 'caderno', quantity: 1 },
      { slug: 'fantasma', quantity: 9 },
    ],
    PRODUTOS,
  );

  assert.deepEqual(
    items.map((item) => item.slug),
    ['caderno'],
  );
});

test('descarta quantidade não positiva', () => {
  assert.deepEqual(buildOrderItems([{ slug: 'caderno', quantity: 0 }], PRODUTOS), []);
  assert.deepEqual(buildOrderItems([{ slug: 'caderno', quantity: -2 }], PRODUTOS), []);
});

test('preserva a ordem das linhas do carrinho', () => {
  const items = buildOrderItems(
    [
      { slug: 'lapis', quantity: 1 },
      { slug: 'caderno', quantity: 1 },
    ],
    PRODUTOS,
  );

  assert.deepEqual(
    items.map((item) => item.slug),
    ['lapis', 'caderno'],
  );
});
