import { and, asc, count, eq, inArray } from 'drizzle-orm';

import { CATALOG } from '../src/data/catalog';
import { db, pool } from '../src/db/client';
import {
  categories,
  inventoryItems,
  productCategories,
  products,
  productVariants,
  programCatalogs,
  programCatalogStages,
  programItems,
  programItemStages,
  schoolStages,
  variantProgramItems,
} from '../src/db/schema';
import { CATEGORIES } from '../src/lib/catalog/categories';
import { EDUCATION_STAGES, MATERIAL_ESCOLAR_YEAR } from '../src/lib/program/material-escolar';

const DEVELOPMENT_CATALOG_VERSION = 'development-seed';

function expectCount(label: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, encontrado ${actual}.`);
  }
}

async function checkDatabase(): Promise<void> {
  const productSlugs = CATALOG.map((product) => product.slug);
  const categorySlugs = CATEGORIES.map((category) => category.slug);
  const stageSlugs = EDUCATION_STAGES.map((stage) => stage.slug);
  const expectedStageLinks = CATALOG.reduce((total, product) => total + product.stages.length, 0);

  const [developmentCatalog] = await db
    .select({
      id: programCatalogs.id,
      status: programCatalogs.status,
      sourceKind: programCatalogs.sourceKind,
    })
    .from(programCatalogs)
    .where(
      and(
        eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
        eq(programCatalogs.version, DEVELOPMENT_CATALOG_VERSION),
        eq(programCatalogs.sourceKind, 'development_seed'),
        eq(programCatalogs.status, 'draft'),
      ),
    )
    .limit(1);

  if (!developmentCatalog) {
    throw new Error('Catálogo provisório development-seed não encontrado.');
  }

  const [
    [categoryCount],
    [stageCount],
    [productCount],
    [variantCount],
    [primaryCategoryCount],
    [inventoryCount],
    [catalogStageCount],
    [programItemCount],
    [programStageCount],
    [variantProgramCount],
    [approvedDevelopmentCount],
    orderedProducts,
  ] = await Promise.all([
    db.select({ value: count() }).from(categories).where(inArray(categories.slug, categorySlugs)),
    db.select({ value: count() }).from(schoolStages).where(inArray(schoolStages.slug, stageSlugs)),
    db.select({ value: count() }).from(products).where(inArray(products.slug, productSlugs)),
    db
      .select({ value: count() })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          inArray(products.slug, productSlugs),
          eq(products.status, 'active'),
          eq(productVariants.status, 'active'),
          eq(productVariants.isDefault, true),
        ),
      ),
    db
      .select({ value: count() })
      .from(productCategories)
      .innerJoin(products, eq(products.id, productCategories.productId))
      .where(and(inArray(products.slug, productSlugs), eq(productCategories.isPrimary, true))),
    db
      .select({ value: count() })
      .from(inventoryItems)
      .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(products.slug, productSlugs)),
    db
      .select({ value: count() })
      .from(programCatalogStages)
      .where(eq(programCatalogStages.catalogId, developmentCatalog.id)),
    db
      .select({ value: count() })
      .from(programItems)
      .where(eq(programItems.catalogId, developmentCatalog.id)),
    db
      .select({ value: count() })
      .from(programItemStages)
      .innerJoin(programItems, eq(programItems.id, programItemStages.programItemId))
      .where(eq(programItems.catalogId, developmentCatalog.id)),
    db
      .select({ value: count() })
      .from(variantProgramItems)
      .innerJoin(programItems, eq(programItems.id, variantProgramItems.programItemId))
      .where(eq(programItems.catalogId, developmentCatalog.id)),
    db
      .select({ value: count() })
      .from(variantProgramItems)
      .innerJoin(programItems, eq(programItems.id, variantProgramItems.programItemId))
      .where(
        and(
          eq(programItems.catalogId, developmentCatalog.id),
          eq(variantProgramItems.isApproved, true),
        ),
      ),
    db
      .select({ slug: products.slug })
      .from(products)
      .where(inArray(products.slug, productSlugs))
      .orderBy(asc(products.sortOrder), asc(products.id)),
  ]);

  expectCount('categorias do seed', categoryCount.value, CATEGORIES.length);
  expectCount('etapas do seed', stageCount.value, EDUCATION_STAGES.length);
  expectCount('produtos do seed', productCount.value, CATALOG.length);
  expectCount('variantes padrão ativas', variantCount.value, CATALOG.length);
  expectCount('categorias primárias', primaryCategoryCount.value, CATALOG.length);
  expectCount('saldos de estoque', inventoryCount.value, CATALOG.length);
  expectCount('etapas do catálogo provisório', catalogStageCount.value, EDUCATION_STAGES.length);
  expectCount('itens do programa provisório', programItemCount.value, CATALOG.length);
  expectCount('vínculos item-etapa', programStageCount.value, expectedStageLinks);
  expectCount('vínculos variante-item', variantProgramCount.value, CATALOG.length);
  expectCount('aprovações indevidas no seed', approvedDevelopmentCount.value, 0);

  const actualOrder = orderedProducts.map((product) => product.slug);
  if (actualOrder.some((slug, index) => slug !== productSlugs[index])) {
    throw new Error('A ordem persistida dos produtos diverge de src/data/catalog.ts.');
  }

  console.log(
    `Banco conferido: ${productCount.value} produtos, ${inventoryCount.value} estoques e ` +
      `${programStageCount.value} vínculos provisórios; catálogo permanece draft/unapproved.`,
  );
}

async function main() {
  try {
    await checkDatabase();
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error(`Verificação do banco falhou: ${message}`);
  process.exitCode = 1;
});
