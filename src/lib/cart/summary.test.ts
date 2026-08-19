import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Product } from '../catalog/product';
import { buildCartSummary, canSubmitOrder } from './summary';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: 'caderno',
    sku: 'CAD-1',
    name: 'Caderno',
    brand: 'Marca',
    category: 'cadernos',
    illustration: 'caderno',
    tagline: 'Tagline',
    description: 'Descrição',
    priceInCents: 1000,
    stages: ['alfabetizacao'],
    stock: 10,
    maxPerOrder: 5,
    specs: [],
    keywords: [],
    ...overrides,
  };
}

test('soma o subtotal e conta as unidades, não as linhas', () => {
  const summary = buildCartSummary(
    [
      { slug: 'a', quantity: 2 },
      { slug: 'b', quantity: 3 },
    ],
    [
      makeProduct({ slug: 'a', priceInCents: 1500 }),
      makeProduct({ slug: 'b', priceInCents: 1000 }),
    ],
    null,
  );

  assert.equal(summary.subtotalInCents, 2 * 1500 + 3 * 1000);
  assert.equal(summary.itemCount, 5);
  assert.equal(summary.items.length, 2);
});

test('separa os slugs que sumiram do catálogo em vez de somá-los como zero', () => {
  const summary = buildCartSummary(
    [
      { slug: 'existe', quantity: 1 },
      { slug: 'sumiu', quantity: 4 },
    ],
    [makeProduct({ slug: 'existe', priceInCents: 800 })],
    null,
  );

  assert.deepEqual(summary.missingSlugs, ['sumiu']);
  assert.equal(summary.itemCount, 1);
  assert.equal(summary.subtotalInCents, 800);
});

test('calcula o saldo restante do crédito da etapa', () => {
  // alfabetizacao: R$ 346,17 de crédito em 2026.
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 2 }],
    [makeProduct({ slug: 'a', priceInCents: 10_000 })],
    'alfabetizacao',
  );

  assert.equal(summary.benefitInCents, 34_617);
  assert.equal(summary.remainingInCents, 34_617 - 20_000);
  assert.equal(summary.overBudgetInCents, 0);
});

test('reporta o excedente quando o carrinho passa do crédito', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 4 }],
    [makeProduct({ slug: 'a', priceInCents: 10_000, maxPerOrder: 10 })],
    'alfabetizacao',
  );

  assert.equal(summary.remainingInCents, 34_617 - 40_000);
  assert.equal(summary.overBudgetInCents, 40_000 - 34_617);
  assert.equal(summary.benefitUsedRatio, 1);
});

test('passar do crédito não bloqueia o pedido', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 4 }],
    [makeProduct({ slug: 'a', priceInCents: 10_000, maxPerOrder: 10 })],
    'alfabetizacao',
  );

  assert.equal(summary.hasBlockingIssues, false);
  assert.equal(canSubmitOrder(summary), true);
});

test('marca item esgotado e bloqueia o envio', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 1 }],
    [makeProduct({ slug: 'a', stock: 0 })],
    null,
  );

  assert.deepEqual(summary.items[0]?.issues, [{ kind: 'esgotado' }]);
  assert.equal(canSubmitOrder(summary), false);
});

test('marca quantidade acima do estoque disponível', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 4 }],
    [makeProduct({ slug: 'a', stock: 2, maxPerOrder: 10 })],
    null,
  );

  assert.deepEqual(summary.items[0]?.issues, [{ kind: 'estoque-insuficiente', available: 2 }]);
});

test('marca quantidade acima do limite por pedido', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 6 }],
    [makeProduct({ slug: 'a', stock: 100, maxPerOrder: 5 })],
    null,
  );

  assert.deepEqual(summary.items[0]?.issues, [{ kind: 'acima-do-limite', maxPerOrder: 5 }]);
});

test('marca item não autorizado para a etapa escolhida', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 1 }],
    [makeProduct({ slug: 'a', stages: ['ensino-medio'] })],
    'alfabetizacao',
  );

  assert.equal(summary.items[0]?.issues[0]?.kind, 'fora-da-etapa');
  assert.equal(canSubmitOrder(summary), false);
});

test('sem etapa escolhida, nenhum item é considerado fora da etapa', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 1 }],
    [makeProduct({ slug: 'a', stages: ['ensino-medio'] })],
    null,
  );

  assert.deepEqual(summary.items[0]?.issues, []);
  assert.equal(summary.benefitInCents, null);
  assert.equal(summary.remainingInCents, null);
});

test('soma a economia das linhas em oferta', () => {
  const summary = buildCartSummary(
    [{ slug: 'a', quantity: 3 }],
    [makeProduct({ slug: 'a', priceInCents: 1000, compareAtPriceInCents: 1400 })],
    null,
  );

  assert.equal(summary.savingsInCents, 3 * 400);
});

test('carrinho vazio não pode ser enviado', () => {
  const summary = buildCartSummary([], [], null);
  assert.equal(canSubmitOrder(summary), false);
  assert.equal(summary.subtotalInCents, 0);
});
