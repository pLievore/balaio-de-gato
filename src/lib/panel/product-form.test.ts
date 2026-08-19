import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectProductErrors,
  parsePriceToCents,
  productFormSchema,
  slugify,
} from './product-form';

const VALIDO = {
  slug: 'caderno-teste-96-folhas',
  name: 'Caderno de teste 96 folhas',
  brand: 'Marca Teste',
  tagline: 'Capa dura, costurado',
  description: 'Caderno usado apenas nos testes automatizados do cadastro do painel.',
  status: 'draft',
  categorySlug: 'cadernos',
  illustrationKey: 'caderno',
  sku: 'TST-CAD-96',
  price: '14,90',
  compareAtPrice: '18,90',
  maxPerOrder: '10',
  keywords: 'caderno, teste',
  specifications: JSON.stringify([{ label: 'Folhas', value: '96' }]),
  stageSlugs: ['alfabetizacao'],
};

function parse(overrides: Record<string, unknown> = {}) {
  return productFormSchema.safeParse({ ...VALIDO, ...overrides });
}

function errorFor(field: string, overrides: Record<string, unknown>) {
  const result = parse(overrides);
  assert.equal(result.success, false, `esperava falha em ${field}`);
  if (result.success) throw new Error('inalcançável');
  return collectProductErrors(result.error)[field as never] as string | undefined;
}

// ─── preço ──────────────────────────────────────────────────────────────────

test('lê preço em real, com ou sem símbolo e separador', () => {
  assert.equal(parsePriceToCents('14,90'), 1490);
  assert.equal(parsePriceToCents('R$ 14,90'), 1490);
  assert.equal(parsePriceToCents('14.90'), 1490);
  assert.equal(parsePriceToCents('1.234,50'), 123450);
  assert.equal(parsePriceToCents('129'), 12900);
});

test('recusa preço inválido ou negativo', () => {
  assert.equal(parsePriceToCents('abc'), null);
  assert.equal(parsePriceToCents(''), null);
  assert.equal(parsePriceToCents('-5'), null);
});

test('o formulário converte preço para centavos', () => {
  const result = parse();
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.price, 1490);
  assert.equal(result.data.compareAtPrice, 1890);
});

test('preço anterior menor que o atual é recusado', () => {
  assert.match(
    errorFor('compareAtPrice', { compareAtPrice: '9,90' }) ?? '',
    /maior que o preço atual/,
  );
});

test('preço anterior vazio vira nulo, não zero', () => {
  const result = parse({ compareAtPrice: '' });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.compareAtPrice, null);
});

// ─── slug ───────────────────────────────────────────────────────────────────

test('slugify remove acento, caixa e pontuação', () => {
  assert.equal(slugify('Caderno Brochura 96 Folhas'), 'caderno-brochura-96-folhas');
  assert.equal(slugify('Lápis de Cor — 24 cores'), 'lapis-de-cor-24-cores');
  assert.equal(slugify('  Régua 30cm!  '), 'regua-30cm');
});

test('recusa slug com acento, espaço ou maiúscula', () => {
  for (const slug of ['Caderno', 'caderno brochura', 'lápis', 'caderno--duplo-']) {
    assert.equal(parse({ slug }).success, false, `"${slug}" deveria ser recusado`);
  }
});

// ─── etapas: a regra que a 801 não tinha ────────────────────────────────────

test('produto sem etapa é recusado — não poderia ser comprado com o crédito', () => {
  assert.match(errorFor('stageSlugs', { stageSlugs: [] }) ?? '', /ao menos uma etapa/);
});

test('recusa etapa que não existe no programa', () => {
  assert.equal(parse({ stageSlugs: ['faculdade'] }).success, false);
});

test('aceita várias etapas', () => {
  const result = parse({ stageSlugs: ['alfabetizacao', 'autoral', 'ensino-medio'] });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.stageSlugs.length, 3);
});

// ─── demais campos ──────────────────────────────────────────────────────────

test('recusa categoria desconhecida', () => {
  assert.ok(errorFor('categorySlug', { categorySlug: 'moveis' }));
});

test('recusa SKU com espaço ou acento', () => {
  assert.ok(errorFor('sku', { sku: 'TST CAD' }));
  assert.ok(errorFor('sku', { sku: 'TST-CADÊ' }));
});

test('limite por pedido precisa ser inteiro positivo', () => {
  assert.ok(errorFor('maxPerOrder', { maxPerOrder: '0' }));
  assert.ok(errorFor('maxPerOrder', { maxPerOrder: '1,5' }));
});

test('palavras-chave viram lista sem vazios', () => {
  const result = parse({ keywords: ' caderno , , teste ,' });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.keywords, ['caderno', 'teste']);
});

test('especificações incompletas são descartadas em vez de gravar lixo', () => {
  const result = parse({
    specifications: JSON.stringify([
      { label: 'Folhas', value: '96' },
      { label: '', value: 'sem rótulo' },
      { label: 'Sem valor', value: '' },
      { naoEhSpec: true },
    ]),
  });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.specifications, [{ label: 'Folhas', value: '96' }]);
});

test('especificação em JSON quebrado vira erro de campo', () => {
  assert.ok(errorFor('specifications', { specifications: '{isso nao e json' }));
});

test('exige descrição com substância', () => {
  assert.ok(errorFor('description', { description: 'curto' }));
});

test('coleta um erro por campo', () => {
  const result = parse({ name: 'x', sku: 'a b', stageSlugs: [] });
  assert.equal(result.success, false);
  if (result.success) return;
  const errors = collectProductErrors(result.error);
  assert.ok(errors.name && errors.sku && errors.stageSlugs);
});
