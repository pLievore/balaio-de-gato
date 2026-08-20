import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Product } from './product';
import {
  buildCatalogHref,
  catalogPriceSteps,
  countActiveFilters,
  EMPTY_QUERY,
  normalizeForSearch,
  parseCatalogQuery,
  scoreProduct,
} from './query';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: 'caderno-brochura',
    sku: 'CAD-BRO-96',
    name: 'Caderno brochura 96 folhas',
    brand: 'Tilibra',
    category: 'cadernos',
    illustration: 'caderno',
    tagline: 'Capa dura, costurado',
    description: 'Caderno brochura de capa dura com 96 folhas pautadas.',
    priceInCents: 1490,
    stages: ['alfabetizacao'],
    stock: 10,
    maxPerOrder: 5,
    specs: [],
    keywords: ['brochurao'],
    ...overrides,
  };
}

// ─── parse ───────────────────────────────────────────────────────────────────

test('devolve a consulta vazia quando não há parâmetro nenhum', () => {
  assert.deepEqual(parseCatalogQuery({}), EMPTY_QUERY);
});

test('aceita categorias separadas por vírgula e repetidas no mesmo parâmetro', () => {
  assert.deepEqual(parseCatalogQuery({ categoria: 'arte,escrita' }).categories, [
    'arte',
    'escrita',
  ]);
  assert.deepEqual(parseCatalogQuery({ categoria: ['arte', 'escrita'] }).categories, [
    'arte',
    'escrita',
  ]);
});

test('descarta categoria desconhecida em vez de zerar o resultado', () => {
  assert.deepEqual(parseCatalogQuery({ categoria: 'arte,inexistente' }).categories, ['arte']);
});

test('não conta a mesma categoria duas vezes', () => {
  assert.deepEqual(parseCatalogQuery({ categoria: 'arte,arte' }).categories, ['arte']);
});

test('converte o teto de preço de reais para centavos', () => {
  assert.equal(parseCatalogQuery({ ate: '25' }).maxPriceInCents, 2500);
});

test('ignora teto de preço inválido ou não positivo', () => {
  assert.equal(parseCatalogQuery({ ate: 'abc' }).maxPriceInCents, null);
  assert.equal(parseCatalogQuery({ ate: '0' }).maxPriceInCents, null);
  assert.equal(parseCatalogQuery({ ate: '-10' }).maxPriceInCents, null);
});

test('cai para relevância quando a ordenação é desconhecida', () => {
  assert.equal(parseCatalogQuery({ ordem: 'aleatorio' }).sort, 'relevancia');
  assert.equal(parseCatalogQuery({ ordem: 'preco-desc' }).sort, 'preco-desc');
});

test('só liga o filtro de disponibilidade com o valor exato', () => {
  assert.equal(parseCatalogQuery({ disponivel: '1' }).inStockOnly, true);
  assert.equal(parseCatalogQuery({ disponivel: 'true' }).inStockOnly, false);
});

test('remove o espaço em volta do texto buscado', () => {
  assert.equal(parseCatalogQuery({ busca: '  lápis  ' }).search, 'lápis');
});

// ─── build ───────────────────────────────────────────────────────────────────

test('a consulta vazia gera a URL limpa, sem cauda de parâmetros', () => {
  assert.equal(buildCatalogHref(EMPTY_QUERY), '/products');
});

test('omite a ordenação padrão da URL', () => {
  assert.equal(buildCatalogHref({ ...EMPTY_QUERY, sort: 'relevancia' }), '/products');
  assert.equal(
    buildCatalogHref({ ...EMPTY_QUERY, sort: 'preco-asc' }),
    '/products?ordem=preco-asc',
  );
});

test('a URL sobrevive à ida e à volta', () => {
  const query = {
    search: 'lápis',
    categories: ['arte', 'escrita'] as const,
    stage: 'alfabetizacao',
    maxPriceInCents: 2500,
    inStockOnly: true,
    sort: 'preco-desc',
  } as const;

  const href = buildCatalogHref({ ...query, categories: [...query.categories] });
  const params = Object.fromEntries(new URL(href, 'https://exemplo.test').searchParams);

  assert.deepEqual(parseCatalogQuery(params), {
    ...query,
    categories: [...query.categories],
  });
});

test('conta cada filtro ligado, somando as categorias uma a uma', () => {
  assert.equal(countActiveFilters(EMPTY_QUERY), 0);
  assert.equal(
    countActiveFilters({
      ...EMPTY_QUERY,
      categories: ['arte', 'escrita'],
      search: 'cola',
      inStockOnly: true,
    }),
    4,
  );
});

// ─── busca ───────────────────────────────────────────────────────────────────

test('a normalização remove acento e caixa', () => {
  assert.equal(normalizeForSearch('Lápis de Cor'), 'lapis de cor');
  assert.equal(normalizeForSearch('  CADERNO  '), 'caderno');
});

test('encontra o produto mesmo sem o acento digitado', () => {
  assert.ok(scoreProduct(makeProduct({ name: 'Lápis de cor' }), 'lapis') > 0);
});

test('todo termo precisa casar — "caderno azul" não traz todo caderno', () => {
  const product = makeProduct();
  assert.ok(scoreProduct(product, 'caderno') > 0);
  assert.equal(scoreProduct(product, 'caderno azul'), 0);
});

test('casar no começo do nome vale mais que casar só na descrição', () => {
  const noNome = makeProduct({ name: 'Cola bastão', description: 'Cola para papel.' });
  const soNaDescricao = makeProduct({
    name: 'Papel criativo',
    description: 'Aceita cola sem enrugar.',
    keywords: [],
    tagline: 'Cores vivas',
  });

  assert.ok(scoreProduct(noNome, 'cola') > scoreProduct(soNaDescricao, 'cola'));
});

test('encontra pelo SKU', () => {
  assert.ok(scoreProduct(makeProduct(), 'CAD-BRO-96') > 0);
});

test('encontra pela marca e pelas palavras-chave', () => {
  assert.ok(scoreProduct(makeProduct(), 'tilibra') > 0);
  assert.ok(scoreProduct(makeProduct(), 'brochurao') > 0);
});

test('busca vazia não filtra nada', () => {
  assert.equal(scoreProduct(makeProduct(), ''), 1);
  assert.equal(scoreProduct(makeProduct(), '   '), 1);
});

// ─── Degraus do filtro de preço ──────────────────────────────────────────────

test('oferece só os degraus dentro da faixa de preço do resultado', () => {
  const steps = catalogPriceSteps({ minInCents: 1500, maxInCents: 6000 });
  assert.deepEqual(steps, [2000, 3500, 5000]);
});

test('faixa estreita não oferece degrau nenhum', () => {
  assert.deepEqual(catalogPriceSteps({ minInCents: 1000, maxInCents: 1200 }), []);
});

test('o degrau ligado aparece mesmo fora da faixa, senão o filtro fica preso', () => {
  // Cenário do bug: teto de R$ 35 escolhido no catálogo inteiro e, depois,
  // uma categoria em que nada passa de R$ 20. Sem esta regra o botão de R$ 35
  // some, e não sobra como desligar o filtro que está zerando a lista.
  const steps = catalogPriceSteps({ minInCents: 500, maxInCents: 2000 }, 3500);
  assert.ok(steps.includes(3500), 'o degrau ligado tem de continuar visível');
  assert.deepEqual(steps, [1000, 3500]);
});

test('o degrau ligado não é duplicado quando já está na faixa', () => {
  const steps = catalogPriceSteps({ minInCents: 500, maxInCents: 6000 }, 2000);
  assert.deepEqual(steps, [1000, 2000, 3500, 5000]);
});
