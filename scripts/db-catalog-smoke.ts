/**
 * Smoke do gerenciamento de catálogo.
 *
 * Cria um produto pelo mesmo caminho do painel, confere que ele nasce completo
 * nas cinco tabelas, edita, ajusta estoque por movimento, importa uma planilha
 * e limpa tudo. É o que garante que o cadastro não produz produto pela metade.
 */

import { and, eq, inArray } from 'drizzle-orm';

import { db, pool } from '../src/db/client';
import {
  inventoryItems,
  inventoryMovements,
  productCategories,
  productMedia,
  products,
  productVariants,
  programItems,
  programItemStages,
  variantProgramItems,
} from '../src/db/schema';
import {
  adjustStock,
  applyImportRows,
  createPanelProduct,
  updatePanelProduct,
} from '../src/lib/panel/catalog-write';
import { getPanelProductDetail } from '../src/lib/panel/catalog';
import { previewImport, CSV_COLUMNS } from '../src/lib/panel/csv';

const SLUG = 'smoke-caderno-do-painel';
const SLUG_IMPORT = 'smoke-import-lapis';
const SKU = 'SMOKE-CAD-01';

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, encontrado ${String(actual)}.`);
  }
}

async function limpar(slugs: string[]): Promise<void> {
  const alvos = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.slug, slugs));
  if (alvos.length === 0) return;

  const ids = alvos.map((p) => p.id);
  const variants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(inArray(productVariants.productId, ids));
  const variantIds = variants.map((v) => v.id);

  if (variantIds.length > 0) {
    const invs = await db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(inArray(inventoryItems.variantId, variantIds));
    if (invs.length > 0) {
      await db
        .delete(inventoryMovements)
        .where(inArray(inventoryMovements.inventoryItemId, invs.map((i) => i.id)));
    }
    await db.delete(inventoryItems).where(inArray(inventoryItems.variantId, variantIds));

    const links = await db
      .select({ programItemId: variantProgramItems.programItemId })
      .from(variantProgramItems)
      .where(inArray(variantProgramItems.variantId, variantIds));
    await db.delete(variantProgramItems).where(inArray(variantProgramItems.variantId, variantIds));

    const programIds = links.map((l) => l.programItemId);
    if (programIds.length > 0) {
      await db.delete(programItemStages).where(inArray(programItemStages.programItemId, programIds));
      await db.delete(programItems).where(inArray(programItems.id, programIds));
    }
  }

  await db.delete(productMedia).where(inArray(productMedia.productId, ids));
  await db.delete(productVariants).where(inArray(productVariants.productId, ids));
  await db.delete(productCategories).where(inArray(productCategories.productId, ids));
  await db.delete(products).where(inArray(products.id, ids));
}

async function main(): Promise<void> {
  await limpar([SLUG, SLUG_IMPORT]);

  // ─── criação ──────────────────────────────────────────────────────────────
  await createPanelProduct({
    slug: SLUG,
    name: 'Caderno do smoke',
    brand: 'Marca Smoke',
    tagline: 'Criado pelo teste automatizado',
    description: 'Produto temporário criado pelo smoke do gerenciamento de catálogo.',
    status: 'draft',
    illustrationKey: 'caderno',
    keywords: ['smoke', 'teste'],
    specifications: [{ label: 'Folhas', value: '96' }],
    categorySlug: 'cadernos',
    sku: SKU,
    priceCents: 1490,
    compareAtPriceCents: 1890,
    maxPerOrder: 7,
    stageSlugs: ['alfabetizacao', 'autoral'],
  });

  const criado = await getPanelProductDetail(SLUG);
  if (!criado) throw new Error('Produto não foi criado.');
  assertEqual('preço gravado', criado.priceInCents, 1490);
  assertEqual('limite por pedido', criado.maxPerOrder, 7);
  assertEqual('etapas autorizadas', criado.stageSlugs.sort().join(','), 'alfabetizacao,autoral');
  assertEqual('estoque inicial', criado.onHand, 0);
  assertEqual('categoria', criado.categorySlug, 'cadernos');
  assertEqual('especificações', criado.specifications.length, 1);

  // O produto tem de existir nas cinco tabelas, não só em `products`.
  const [variante] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(products.slug, SLUG));
  if (!variante) throw new Error('Variante não foi criada.');

  const [vinculo] = await db
    .select({ id: variantProgramItems.programItemId })
    .from(variantProgramItems)
    .where(eq(variantProgramItems.variantId, variante.id));
  if (!vinculo) throw new Error('Vínculo com o programa não foi criado.');

  // ─── edição ───────────────────────────────────────────────────────────────
  await updatePanelProduct(SLUG, {
    slug: SLUG,
    name: 'Caderno do smoke editado',
    brand: 'Marca Smoke',
    tagline: 'Editado pelo teste',
    description: 'Descrição atualizada pelo smoke do gerenciamento de catálogo.',
    status: 'active',
    illustrationKey: 'caderno',
    keywords: ['smoke'],
    specifications: [],
    categorySlug: 'escrita',
    sku: SKU,
    priceCents: 1990,
    compareAtPriceCents: null,
    maxPerOrder: 3,
    stageSlugs: ['ensino-medio'],
  });

  const editado = await getPanelProductDetail(SLUG);
  assertEqual('novo preço', editado?.priceInCents, 1990);
  assertEqual('oferta removida', editado?.compareAtPriceInCents, null);
  assertEqual('nova categoria', editado?.categorySlug, 'escrita');
  assertEqual('etapas substituídas', editado?.stageSlugs.join(','), 'ensino-medio');
  assertEqual('situação', editado?.status, 'active');

  // ─── estoque por movimento ────────────────────────────────────────────────
  await adjustStock(SLUG, { onHand: 25, reason: 'Entrada do smoke.' });
  const comEstoque = await getPanelProductDetail(SLUG);
  assertEqual('estoque após entrada', comEstoque?.onHand, 25);

  const [movimento] = await db
    .select({ type: inventoryMovements.type, delta: inventoryMovements.onHandDelta })
    .from(inventoryMovements)
    .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryMovements.inventoryItemId))
    .where(and(eq(inventoryItems.variantId, variante.id), eq(inventoryMovements.type, 'receipt')));
  assertEqual('movimento de entrada registrado', movimento?.delta, 25);

  await adjustStock(SLUG, { onHand: 20, reason: 'Correção de contagem do smoke.' });
  assertEqual('estoque após correção', (await getPanelProductDetail(SLUG))?.onHand, 20);

  // ─── importação ───────────────────────────────────────────────────────────
  const csv = [
    CSV_COLUMNS.join(';'),
    [
      SLUG_IMPORT, 'SMOKE-LAP-01', 'Lápis do smoke', 'Marca Smoke', 'Vindo da planilha',
      'Produto temporário criado pela importação do smoke.', 'escrita', 'active', 'lapis',
      '9,90', '', '4', '12', 'alfabetizacao|interdisciplinar', 'lapis|smoke',
    ].join(';'),
  ].join('\n');

  const preview = previewImport(csv);
  assertEqual('planilha sem problemas', preview.issues.length, 0);
  assertEqual('linhas para importar', preview.rows.length, 1);

  const resultado = await applyImportRows(preview.rows);
  assertEqual('produtos criados pela importação', resultado.created, 1);
  assertEqual('falhas na importação', resultado.failed.length, 0);

  const importado = await getPanelProductDetail(SLUG_IMPORT);
  assertEqual('preço importado', importado?.priceInCents, 990);
  assertEqual('estoque importado', importado?.onHand, 12);
  assertEqual(
    'etapas importadas',
    importado?.stageSlugs.sort().join(','),
    'alfabetizacao,interdisciplinar',
  );

  // Reimportar a mesma linha atualiza em vez de duplicar.
  const denovo = await applyImportRows(preview.rows);
  assertEqual('reimportação atualiza', denovo.updated, 1);
  assertEqual('reimportação não cria', denovo.created, 0);

  console.log(
    'Smoke do catálogo passou: criação completa nas cinco tabelas, edição, ' +
      'estoque por movimento, importação e reimportação idempotente.',
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await limpar([SLUG, SLUG_IMPORT]).catch(() => undefined);
    await pool.end();
  });
