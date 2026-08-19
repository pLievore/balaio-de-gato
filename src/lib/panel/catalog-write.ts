import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  auditEvents,
  categories,
  inventoryItems,
  inventoryMovements,
  productCategories,
  productMedia,
  products,
  productVariants,
  programCatalogs,
  programItems,
  programItemStages,
  schoolStages,
  variantProgramItems,
  type ProductSpecification,
} from '../../db/schema';
import { MATERIAL_ESCOLAR_YEAR } from '../program/material-escolar';

/**
 * Escrita do catálogo pelo painel.
 *
 * Um produto da Balaio não é uma linha: ele existe em cinco tabelas ligadas —
 * produto, categoria, variante, item do programa (com as etapas autorizadas) e
 * estoque. Este módulo é o único lugar que sabe montar esse conjunto inteiro,
 * sempre dentro de uma transação, para que nunca exista um produto pela metade
 * — visível na loja mas sem estoque, ou com preço mas sem etapa autorizada.
 *
 * Estoque nunca é escrito direto. Toda mudança vira um movimento em
 * `inventory_movements`, porque a trilha de auditoria é exigência do programa e
 * um `UPDATE` silencioso a tornaria mentirosa.
 */

const DEVELOPMENT_CATALOG_VERSION = 'development-seed';

/** A transação que o Drizzle entrega ao callback — não é o mesmo tipo de `db`. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProductWriteInput = {
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  illustrationKey: string | null;
  keywords: string[];
  specifications: ProductSpecification[];
  categorySlug: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  maxPerOrder: number;
  /** Slugs das etapas de ensino autorizadas a comprar o item com o crédito. */
  stageSlugs: string[];
};

export type StockInput = {
  onHand: number;
  reason: string;
};

/** Catálogo de programa em que o painel escreve. Hoje é o de desenvolvimento. */
async function resolveWritableCatalogId(tx: Tx): Promise<string> {
  const [published] = await tx
    .select({ id: programCatalogs.id })
    .from(programCatalogs)
    .where(
      and(
        eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
        eq(programCatalogs.status, 'published'),
      ),
    )
    .limit(1);
  if (published) return published.id;

  const [development] = await tx
    .select({ id: programCatalogs.id })
    .from(programCatalogs)
    .where(
      and(
        eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
        eq(programCatalogs.version, DEVELOPMENT_CATALOG_VERSION),
      ),
    )
    .limit(1);
  if (development) return development.id;

  throw new Error(
    `Nenhum catálogo de ${MATERIAL_ESCOLAR_YEAR} encontrado. Rode o seed antes de cadastrar produtos.`,
  );
}

async function stageIdsFor(tx: Tx, slugs: string[]): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await tx
    .select({ id: schoolStages.id, slug: schoolStages.slug })
    .from(schoolStages)
    .where(inArray(schoolStages.slug, slugs));

  const found = new Map(rows.map((row) => [row.slug, row.id]));
  for (const slug of slugs) {
    if (!found.has(slug)) throw new Error(`Etapa desconhecida: ${slug}.`);
  }
  return found;
}

/**
 * Reescreve as etapas autorizadas do item. Apaga e recria porque a lista é
 * pequena e o conjunto inteiro é a verdade — reconciliar linha a linha daria
 * mais código e o mesmo resultado.
 */
async function writeStages(
  tx: Tx,
  programItemId: string,
  stageSlugs: string[],
  maxPerOrder: number,
): Promise<void> {
  const ids = await stageIdsFor(tx, stageSlugs);
  await tx.delete(programItemStages).where(eq(programItemStages.programItemId, programItemId));

  for (const slug of stageSlugs) {
    await tx.insert(programItemStages).values({
      programItemId,
      stageId: ids.get(slug)!,
      recommendedQuantity: 1,
      maxQuantity: maxPerOrder,
    });
  }
}

async function categoryIdFor(tx: Tx, slug: string): Promise<string> {
  const [row] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!row) throw new Error(`Categoria desconhecida: ${slug}.`);
  return row.id;
}

export async function createPanelProduct(input: ProductWriteInput): Promise<{ slug: string }> {
  return db.transaction(async (tx) => {
    const catalogId = await resolveWritableCatalogId(tx);
    const categoryId = await categoryIdFor(tx, input.categorySlug);
    const correlationId = randomUUID();

    const [product] = await tx
      .insert(products)
      .values({
        slug: input.slug,
        name: input.name,
        brand: input.brand,
        tagline: input.tagline,
        description: input.description,
        status: input.status,
        illustrationKey: input.illustrationKey,
        keywords: input.keywords,
        specifications: input.specifications,
        archivedAt: input.status === 'archived' ? new Date() : null,
      })
      .returning({ id: products.id });
    if (!product) throw new Error('Não foi possível criar o produto.');

    await tx
      .insert(productCategories)
      .values({ productId: product.id, categoryId, isPrimary: true, sortOrder: 0 });

    const [variant] = await tx
      .insert(productVariants)
      .values({
        productId: product.id,
        sku: input.sku,
        name: 'Padrão',
        status: input.status,
        isDefault: true,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents,
        unitOfMeasure: 'un',
        maxPerOrder: input.maxPerOrder,
        archivedAt: input.status === 'archived' ? new Date() : null,
      })
      .returning({ id: productVariants.id });
    if (!variant) throw new Error('Não foi possível criar a variante.');

    const [programItem] = await tx
      .insert(programItems)
      .values({
        catalogId,
        code: input.sku.toLowerCase(),
        officialName: input.name,
        officialDescription: input.description,
        specifications: { productSpecs: input.specifications },
        unitOfMeasure: 'un',
        maxUnitPriceCents: null,
        sourceReference: `painel#${input.slug}`,
      })
      .returning({ id: programItems.id });
    if (!programItem) throw new Error('Não foi possível criar o item do programa.');

    await writeStages(tx, programItem.id, input.stageSlugs, input.maxPerOrder);

    await tx.insert(variantProgramItems).values({
      variantId: variant.id,
      programItemId: programItem.id,
      // Um item cadastrado pelo painel não nasce aprovado: a aprovação é um
      // ato do programa, não do cadastro.
      isApproved: false,
    });

    // Estoque começa em zero e sobe por um movimento de entrada, para que a
    // primeira unidade também tenha origem registrada.
    const [inventory] = await tx
      .insert(inventoryItems)
      .values({ variantId: variant.id, onHand: 0, reserved: 0 })
      .returning({ id: inventoryItems.id });
    if (!inventory) throw new Error('Não foi possível criar o registro de estoque.');

    await tx.insert(inventoryMovements).values({
      inventoryItemId: inventory.id,
      type: 'opening',
      onHandDelta: 0,
      reservedDelta: 0,
      resultingOnHand: 0,
      resultingReserved: 0,
      reason: `Produto ${input.slug} cadastrado pelo painel.`,
      idempotencyKey: `panel:opening:${variant.id}`,
      correlationId,
    });

    await tx.insert(auditEvents).values({
      actorKind: 'system',
      action: 'product.created',
      resourceType: 'product',
      resourceId: product.id,
      before: {},
      after: { slug: input.slug, sku: input.sku, status: input.status },
      metadata: { actor: 'painel' },
      idempotencyKey: `panel:product-create:${product.id}`,
      correlationId,
    });

    return { slug: input.slug };
  });
}

export async function updatePanelProduct(
  slug: string,
  input: ProductWriteInput,
): Promise<{ slug: string }> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
      .for('update');
    if (!current) throw new Error(`Produto ${slug} não encontrado.`);

    const correlationId = randomUUID();
    const now = new Date();

    await tx
      .update(products)
      .set({
        slug: input.slug,
        name: input.name,
        brand: input.brand,
        tagline: input.tagline,
        description: input.description,
        status: input.status,
        illustrationKey: input.illustrationKey,
        keywords: input.keywords,
        specifications: input.specifications,
        // A tabela exige que arquivado e data de arquivamento andem juntos.
        archivedAt: input.status === 'archived' ? now : null,
        updatedAt: now,
      })
      .where(eq(products.id, current.id));

    const categoryId = await categoryIdFor(tx, input.categorySlug);
    await tx.delete(productCategories).where(eq(productCategories.productId, current.id));
    await tx
      .insert(productCategories)
      .values({ productId: current.id, categoryId, isPrimary: true, sortOrder: 0 });

    const [variant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, current.id))
      .orderBy(asc(productVariants.createdAt))
      .limit(1);
    if (!variant) throw new Error(`Produto ${slug} está sem variante.`);

    await tx
      .update(productVariants)
      .set({
        sku: input.sku,
        status: input.status,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents,
        maxPerOrder: input.maxPerOrder,
        archivedAt: input.status === 'archived' ? now : null,
        updatedAt: now,
      })
      .where(eq(productVariants.id, variant.id));

    const [link] = await tx
      .select({ programItemId: variantProgramItems.programItemId })
      .from(variantProgramItems)
      .where(eq(variantProgramItems.variantId, variant.id))
      .limit(1);
    if (!link) throw new Error(`Produto ${slug} não está ligado ao programa.`);

    await tx
      .update(programItems)
      .set({
        officialName: input.name,
        officialDescription: input.description,
        specifications: { productSpecs: input.specifications },
        updatedAt: now,
      })
      .where(eq(programItems.id, link.programItemId));

    await writeStages(tx, link.programItemId, input.stageSlugs, input.maxPerOrder);

    await tx.insert(auditEvents).values({
      actorKind: 'system',
      action: 'product.updated',
      resourceType: 'product',
      resourceId: current.id,
      before: { slug, status: current.status },
      after: { slug: input.slug, status: input.status, priceCents: input.priceCents },
      metadata: { actor: 'painel' },
      idempotencyKey: `panel:product-update:${current.id}:${correlationId}`,
      correlationId,
    });

    return { slug: input.slug };
  });
}

/**
 * Ajusta o estoque físico por um movimento, nunca por escrita direta.
 *
 * `reserved` não é tocado: ele pertence aos pedidos abertos. Por isso o novo
 * valor de `on_hand` não pode ficar abaixo do que já está reservado — seria
 * prometer o que não existe mais.
 */
export async function adjustStock(slug: string, input: StockInput): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        inventoryItemId: inventoryItems.id,
        onHand: inventoryItems.onHand,
        reserved: inventoryItems.reserved,
      })
      .from(inventoryItems)
      .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(products.slug, slug))
      .limit(1)
      .for('update', { of: inventoryItems });
    if (!row) throw new Error(`Estoque de ${slug} não encontrado.`);

    const delta = input.onHand - row.onHand;
    if (delta === 0) return;

    if (input.onHand < row.reserved) {
      throw new Error(
        `Não é possível deixar ${input.onHand} em estoque: ${row.reserved} já estão reservados por pedidos abertos.`,
      );
    }

    const [updated] = await tx
      .update(inventoryItems)
      .set({
        onHand: input.onHand,
        version: sql`${inventoryItems.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, row.inventoryItemId))
      .returning({ onHand: inventoryItems.onHand, reserved: inventoryItems.reserved });
    if (!updated) throw new Error('Não foi possível ajustar o estoque.');

    const correlationId = randomUUID();
    await tx.insert(inventoryMovements).values({
      inventoryItemId: row.inventoryItemId,
      // Entrada de mercadoria é `receipt`; correção para baixo é `adjustment`.
      type: delta > 0 ? 'receipt' : 'adjustment',
      onHandDelta: delta,
      reservedDelta: 0,
      resultingOnHand: updated.onHand,
      resultingReserved: updated.reserved,
      reason: input.reason,
      idempotencyKey: `panel:stock:${row.inventoryItemId}:${correlationId}`,
      correlationId,
    });
  });
}

// ─── Mídia ───────────────────────────────────────────────────────────────────

export async function addProductMedia(
  slug: string,
  media: { objectKey: string; mimeType: string; altText: string | null; width?: number; height?: number },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (!product) throw new Error(`Produto ${slug} não encontrado.`);

    const [last] = await tx
      .select({ sortOrder: productMedia.sortOrder })
      .from(productMedia)
      .where(eq(productMedia.productId, product.id))
      .orderBy(sql`${productMedia.sortOrder} desc`)
      .limit(1);

    await tx.insert(productMedia).values({
      productId: product.id,
      objectKey: media.objectKey,
      mimeType: media.mimeType,
      altText: media.altText,
      width: media.width ?? null,
      height: media.height ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    });
  });
}

/** Devolve a chave removida, para quem chamou apagar o arquivo no armazenamento. */
export async function removeProductMedia(mediaId: string): Promise<string | null> {
  const [removed] = await db
    .delete(productMedia)
    .where(eq(productMedia.id, mediaId))
    .returning({ objectKey: productMedia.objectKey });
  return removed?.objectKey ?? null;
}

export async function reorderProductMedia(orderedIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(productMedia)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(productMedia.id, id));
    }
  });
}

/**
 * Aplica as linhas conferidas de um CSV.
 *
 * Cada linha é criada ou atualizada pela mesma função que o formulário usa, e
 * o estoque entra por movimento. Isso é mais lento que um `COPY`, e é de
 * propósito: um import não pode ter regra diferente de um cadastro manual,
 * senão ele vira a porta dos fundos que fura a auditoria.
 */
export async function applyImportRows(
  rows: readonly {
    slug: string;
    sku: string;
    name: string;
    brand: string;
    tagline: string;
    description: string;
    categorySlug: string;
    status: 'draft' | 'active' | 'archived';
    illustrationKey: string | null;
    priceCents: number;
    compareAtPriceCents: number | null;
    maxPerOrder: number;
    stock: number;
    stageSlugs: string[];
    keywords: string[];
  }[],
): Promise<{ created: number; updated: number; failed: { slug: string; message: string }[] }> {
  let created = 0;
  let updated = 0;
  const failed: { slug: string; message: string }[] = [];

  const existing = await db.select({ slug: products.slug }).from(products);
  const known = new Set(existing.map((row) => row.slug));

  for (const row of rows) {
    const input = {
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      tagline: row.tagline,
      description: row.description,
      status: row.status,
      illustrationKey: row.illustrationKey,
      keywords: row.keywords,
      specifications: [],
      categorySlug: row.categorySlug,
      sku: row.sku,
      priceCents: row.priceCents,
      compareAtPriceCents: row.compareAtPriceCents,
      maxPerOrder: row.maxPerOrder,
      stageSlugs: row.stageSlugs,
    };

    try {
      if (known.has(row.slug)) {
        await updatePanelProduct(row.slug, input);
        updated += 1;
      } else {
        await createPanelProduct(input);
        created += 1;
      }
      await adjustStock(row.slug, {
        onHand: row.stock,
        reason: 'Carga de catálogo por importação de planilha.',
      });
    } catch (error) {
      failed.push({
        slug: row.slug,
        message: error instanceof Error ? error.message : 'Falha desconhecida.',
      });
    }
  }

  return { created, updated, failed };
}

/** Catálogo inteiro no formato do CSV, para conferência fora do painel. */
export async function exportCatalogRows() {
  const rows = await db
    .select({
      slug: products.slug,
      sku: productVariants.sku,
      name: products.name,
      brand: products.brand,
      tagline: products.tagline,
      description: products.description,
      status: products.status,
      illustrationKey: products.illustrationKey,
      priceCents: productVariants.priceCents,
      compareAtPriceCents: productVariants.compareAtPriceCents,
      maxPerOrder: productVariants.maxPerOrder,
      onHand: inventoryItems.onHand,
      keywords: products.keywords,
      categorySlug: categories.slug,
      variantId: productVariants.id,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
    .leftJoin(productCategories, eq(productCategories.productId, products.id))
    .leftJoin(categories, eq(categories.id, productCategories.categoryId))
    .orderBy(asc(products.name));

  const stages = await db
    .select({ variantId: variantProgramItems.variantId, slug: schoolStages.slug })
    .from(variantProgramItems)
    .innerJoin(programItemStages, eq(programItemStages.programItemId, variantProgramItems.programItemId))
    .innerJoin(schoolStages, eq(schoolStages.id, programItemStages.stageId));

  const stagesByVariant = new Map<string, Set<string>>();
  for (const entry of stages) {
    const set = stagesByVariant.get(entry.variantId) ?? new Set<string>();
    set.add(entry.slug);
    stagesByVariant.set(entry.variantId, set);
  }

  return rows.map((row) => ({
    ...row,
    stageSlugs: [...(stagesByVariant.get(row.variantId ?? '') ?? [])],
  }));
}
