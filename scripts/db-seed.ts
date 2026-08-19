import { and, eq, or, sql } from 'drizzle-orm';

import { CATALOG } from '../src/data/catalog';
import { db, pool } from '../src/db/client';
import {
  categories,
  inventoryItems,
  inventoryMovements,
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
import { LOW_STOCK_THRESHOLD } from '../src/lib/catalog/product';
import { EDUCATION_STAGES, MATERIAL_ESCOLAR_YEAR } from '../src/lib/program/material-escolar';

const DEVELOPMENT_CATALOG_VERSION = 'development-seed';
const DEVELOPMENT_SOURCE_URL = 'development-seed://src/data/catalog.ts';
const DEVELOPMENT_SOURCE_DATE = new Date(Date.UTC(MATERIAL_ESCOLAR_YEAR, 0, 1));

type SeedSummary = {
  categories: number;
  stages: number;
  products: number;
  stageLinks: number;
  inventoryItems: number;
};

async function seedDatabase(): Promise<SeedSummary> {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_DEVELOPMENT_CATALOG !== 'true'
  ) {
    throw new Error(
      'Seed provisório bloqueado em produção sem ALLOW_DEVELOPMENT_CATALOG=true.',
    );
  }

  return db.transaction(async (tx) => {
    const [publishedCatalog] = await tx
      .select({ id: programCatalogs.id })
      .from(programCatalogs)
      .where(
        and(
          eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
          eq(programCatalogs.sourceKind, 'official'),
          eq(programCatalogs.status, 'published'),
        ),
      )
      .limit(1);

    if (publishedCatalog) {
      throw new Error(
        `O catálogo oficial de ${MATERIAL_ESCOLAR_YEAR} já foi publicado; o seed de desenvolvimento foi bloqueado.`,
      );
    }

    const now = new Date();
    const categoryIds = new Map<string, string>();
    for (const [sortOrder, category] of CATEGORIES.entries()) {
      const [row] = await tx
        .insert(categories)
        .values({
          slug: category.slug,
          name: category.name,
          shortName: category.shortName,
          description: category.description,
          tone: category.tone,
          sortOrder,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            name: category.name,
            shortName: category.shortName,
            description: category.description,
            tone: category.tone,
            sortOrder,
            isActive: true,
            updatedAt: now,
          },
        })
        .returning({ id: categories.id });
      categoryIds.set(category.slug, row.id);
    }

    const stageIds = new Map<string, string>();
    for (const [sortOrder, stage] of EDUCATION_STAGES.entries()) {
      const [row] = await tx
        .insert(schoolStages)
        .values({
          slug: stage.slug,
          shortName: stage.shortName,
          name: stage.name,
          rangeLabel: stage.range,
          accent: stage.accent,
          sortOrder,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: schoolStages.slug,
          set: {
            shortName: stage.shortName,
            name: stage.name,
            rangeLabel: stage.range,
            accent: stage.accent,
            sortOrder,
            isActive: true,
            updatedAt: now,
          },
        })
        .returning({ id: schoolStages.id });
      stageIds.set(stage.slug, row.id);
    }

    const [developmentCatalog] = await tx
      .insert(programCatalogs)
      .values({
        year: MATERIAL_ESCOLAR_YEAR,
        version: DEVELOPMENT_CATALOG_VERSION,
        name: `Catálogo provisório de desenvolvimento ${MATERIAL_ESCOLAR_YEAR}`,
        sourceUrl: DEVELOPMENT_SOURCE_URL,
        sourceKind: 'development_seed',
        sourceObtainedAt: DEVELOPMENT_SOURCE_DATE,
        status: 'draft',
      })
      .onConflictDoUpdate({
        target: [programCatalogs.year, programCatalogs.version],
        set: {
          name: `Catálogo provisório de desenvolvimento ${MATERIAL_ESCOLAR_YEAR}`,
          sourceUrl: DEVELOPMENT_SOURCE_URL,
          sourceKind: 'development_seed',
          sourceObtainedAt: DEVELOPMENT_SOURCE_DATE,
          status: 'draft',
          publishedAt: null,
          publishedBy: null,
          updatedAt: now,
        },
      })
      .returning({ id: programCatalogs.id });

    for (const stage of EDUCATION_STAGES) {
      const stageId = stageIds.get(stage.slug);
      if (!stageId) throw new Error(`Etapa não persistida: ${stage.slug}.`);

      await tx
        .insert(programCatalogStages)
        .values({
          catalogId: developmentCatalog.id,
          stageId,
          benefitAmountCents: stage.benefitAmountInCents,
        })
        .onConflictDoUpdate({
          target: [programCatalogStages.catalogId, programCatalogStages.stageId],
          set: { benefitAmountCents: stage.benefitAmountInCents, updatedAt: now },
        });
    }

    let stageLinks = 0;
    let inventoryCount = 0;

    for (const [sortOrder, product] of CATALOG.entries()) {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error(`Categoria não persistida: ${product.category}.`);

      const [productRow] = await tx
        .insert(products)
        .values({
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          tagline: product.tagline,
          description: product.description,
          status: 'active',
          illustrationKey: product.illustration,
          keywords: [...product.keywords],
          specifications: product.specs.map((spec) => ({ ...spec })),
          sortOrder,
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            name: product.name,
            brand: product.brand,
            tagline: product.tagline,
            description: product.description,
            status: 'active',
            illustrationKey: product.illustration,
            keywords: [...product.keywords],
            specifications: product.specs.map((spec) => ({ ...spec })),
            sortOrder,
            archivedAt: null,
            updatedAt: now,
          },
        })
        .returning({ id: products.id });

      // Preserve secondary categories, but make the seed category authoritative
      // as the single primary category for this seeded product.
      await tx
        .update(productCategories)
        .set({ isPrimary: false })
        .where(eq(productCategories.productId, productRow.id));
      await tx
        .insert(productCategories)
        .values({ productId: productRow.id, categoryId, isPrimary: true, sortOrder: 0 })
        .onConflictDoUpdate({
          target: [productCategories.productId, productCategories.categoryId],
          set: { isPrimary: true, sortOrder: 0 },
        });

      const matchingVariants = await tx
        .select({ id: productVariants.id, productId: productVariants.productId })
        .from(productVariants)
        .where(
          or(
            and(eq(productVariants.productId, productRow.id), eq(productVariants.isDefault, true)),
            sql`lower(${productVariants.sku}) = lower(${product.sku})`,
          ),
        );

      const uniqueVariants = new Map(matchingVariants.map((variant) => [variant.id, variant]));
      if (uniqueVariants.size > 1) {
        throw new Error(`SKU/default variant ambíguos para ${product.slug}.`);
      }

      const existingVariant = uniqueVariants.values().next().value as
        | { id: string; productId: string }
        | undefined;
      if (existingVariant && existingVariant.productId !== productRow.id) {
        throw new Error(`O SKU ${product.sku} já pertence a outro produto.`);
      }

      const [variantRow] = existingVariant
        ? await tx
            .update(productVariants)
            .set({
              sku: product.sku,
              name: 'Padrão',
              status: 'active',
              isDefault: true,
              priceCents: product.priceInCents,
              compareAtPriceCents: product.compareAtPriceInCents ?? null,
              unitOfMeasure: 'un',
              maxPerOrder: product.maxPerOrder,
              archivedAt: null,
              updatedAt: now,
            })
            .where(eq(productVariants.id, existingVariant.id))
            .returning({ id: productVariants.id })
        : await tx
            .insert(productVariants)
            .values({
              productId: productRow.id,
              sku: product.sku,
              name: 'Padrão',
              status: 'active',
              isDefault: true,
              priceCents: product.priceInCents,
              compareAtPriceCents: product.compareAtPriceInCents ?? null,
              unitOfMeasure: 'un',
              maxPerOrder: product.maxPerOrder,
            })
            .returning({ id: productVariants.id });

      const stableProgramCode = `DEV-${product.slug}`;
      if (stableProgramCode.length > 120) {
        throw new Error(`Código provisório muito longo para ${product.slug}.`);
      }

      const linkedProgramItems = await tx
        .select({ id: programItems.id })
        .from(programItems)
        .innerJoin(
          variantProgramItems,
          eq(variantProgramItems.programItemId, programItems.id),
        )
        .where(
          and(
            eq(programItems.catalogId, developmentCatalog.id),
            eq(variantProgramItems.variantId, variantRow.id),
          ),
        );
      if (linkedProgramItems.length > 1) {
        throw new Error(`Vínculos provisórios ambíguos para ${product.slug}.`);
      }

      const programItemValues = {
        code: stableProgramCode,
        officialName: product.name,
        officialDescription: product.description,
        specifications: { productSpecs: product.specs.map((spec) => ({ ...spec })) },
        unitOfMeasure: 'un',
        maxUnitPriceCents: null,
        sourceReference: `src/data/catalog.ts#${product.slug}`,
        updatedAt: now,
      } as const;

      let programItem: { id: string };
      if (linkedProgramItems[0]) {
        [programItem] = await tx
          .update(programItems)
          .set(programItemValues)
          .where(eq(programItems.id, linkedProgramItems[0].id))
          .returning({ id: programItems.id });
      } else {
        [programItem] = await tx
          .insert(programItems)
          .values({ catalogId: developmentCatalog.id, ...programItemValues })
          .onConflictDoUpdate({
            target: [programItems.catalogId, programItems.code],
            set: programItemValues,
          })
          .returning({ id: programItems.id });
      }

      // Reconcile only relations owned by this development catalog item.
      await tx.delete(programItemStages).where(eq(programItemStages.programItemId, programItem.id));
      for (const stageSlug of product.stages) {
        const stageId = stageIds.get(stageSlug);
        if (!stageId) throw new Error(`Etapa desconhecida em ${product.slug}: ${stageSlug}.`);
        await tx.insert(programItemStages).values({
          programItemId: programItem.id,
          stageId,
          recommendedQuantity: 1,
          maxQuantity: product.maxPerOrder,
        });
        stageLinks += 1;
      }

      await tx
        .insert(variantProgramItems)
        .values({
          variantId: variantRow.id,
          programItemId: programItem.id,
          isApproved: false,
        })
        .onConflictDoUpdate({
          target: [variantProgramItems.variantId, variantProgramItems.programItemId],
          set: {
            isApproved: false,
            approvedAt: null,
            approvedBy: null,
            updatedAt: now,
          },
        });

      const [existingInventory] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(eq(inventoryItems.variantId, variantRow.id))
        .limit(1);

      if (existingInventory) {
        // A repeatable seed must never reset stock after reservations or sales.
        await tx
          .update(inventoryItems)
          .set({ lowStockThreshold: LOW_STOCK_THRESHOLD, updatedAt: now })
          .where(eq(inventoryItems.id, existingInventory.id));
      } else {
        const [inventory] = await tx
          .insert(inventoryItems)
          .values({
            variantId: variantRow.id,
            onHand: product.stock,
            reserved: 0,
            lowStockThreshold: LOW_STOCK_THRESHOLD,
          })
          .returning({ id: inventoryItems.id });

        if (product.stock > 0) {
          await tx
            .insert(inventoryMovements)
            .values({
              inventoryItemId: inventory.id,
              type: 'opening',
              onHandDelta: product.stock,
              reservedDelta: 0,
              resultingOnHand: product.stock,
              resultingReserved: 0,
              reason: 'Carga inicial do catálogo provisório de desenvolvimento.',
              idempotencyKey: `development-seed:opening:${product.sku.toLowerCase()}`,
              correlationId: developmentCatalog.id,
            })
            .onConflictDoNothing({ target: inventoryMovements.idempotencyKey });
        }
      }
      inventoryCount += 1;
    }

    return {
      categories: CATEGORIES.length,
      stages: EDUCATION_STAGES.length,
      products: CATALOG.length,
      stageLinks,
      inventoryItems: inventoryCount,
    };
  });
}

async function main() {
  try {
    const summary = await seedDatabase();
    console.log(
      `Seed concluído: ${summary.categories} categorias, ${summary.stages} etapas, ` +
        `${summary.products} produtos, ${summary.stageLinks} vínculos e ` +
        `${summary.inventoryItems} saldos de estoque.`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error(`Seed falhou: ${message}`);
  process.exitCode = 1;
});
