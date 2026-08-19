import 'server-only';

import { asc, count, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  categories,
  inventoryItems,
  productCategories,
  productMedia,
  products,
  productVariants,
  programItems,
  programItemStages,
  schoolStages,
  variantProgramItems,
} from '../../db/schema';

/**
 * Catálogo para o painel, direto do PostgreSQL.
 *
 * A leitura é própria do painel, e não reaproveita `catalog/repository`, por um
 * motivo: a loja só enxerga o que está publicado e disponível, enquanto a
 * operação precisa ver também o rascunho, o inativo e o que zerou. Compartilhar
 * a consulta esconderia justamente o que o painel existe para mostrar.
 */

export type PanelProductRow = {
  slug: string;
  name: string;
  brand: string | null;
  status: string;
  categoryName: string | null;
  priceInCents: number | null;
  onHand: number;
  reserved: number;
  available: number;
};

export type PanelCatalogFilters = {
  search?: string;
  status?: string;
};

export async function listPanelProducts(
  filters: PanelCatalogFilters = {},
): Promise<PanelProductRow[]> {
  const conditions = [];

  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(products.name, pattern), ilike(products.slug, pattern))!);
  }
  if (filters.status && filters.status !== 'todos') {
    conditions.push(eq(products.status, filters.status as 'active'));
  }

  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      status: products.status,
      categoryName: categories.name,
      priceInCents: productVariants.priceCents,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
    .leftJoin(productCategories, eq(productCategories.productId, products.id))
    .leftJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} and ${b}`)}` : undefined)
    .orderBy(asc(products.name))
    .limit(300);

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    status: row.status,
    categoryName: row.categoryName,
    priceInCents: row.priceInCents,
    onHand: row.onHand ?? 0,
    reserved: row.reserved ?? 0,
    available: (row.onHand ?? 0) - (row.reserved ?? 0),
  }));
}

export type CatalogCounts = {
  total: number;
  active: number;
  draft: number;
  outOfStock: number;
};

export async function getCatalogCounts(): Promise<CatalogCounts> {
  const [row] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      draft: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
      outOfStock: sql<number>`count(*) filter (
        where coalesce(${inventoryItems.onHand}, 0) - coalesce(${inventoryItems.reserved}, 0) <= 0
      )::int`,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id));

  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    draft: row?.draft ?? 0,
    outOfStock: row?.outOfStock ?? 0,
  };
}

export type PanelProductDetail = {
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  description: string;
  status: string;
  illustrationKey: string | null;
  keywords: string[];
  specifications: { label: string; value: string }[];
  categorySlug: string | null;
  sku: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  maxPerOrder: number;
  onHand: number;
  reserved: number;
  stageSlugs: string[];
  media: { id: string; objectKey: string; altText: string | null; sortOrder: number }[];
};

/**
 * Ficha completa para a tela de edição.
 *
 * Diferente da leitura da loja, aqui vem também o que está em rascunho, o que
 * está esgotado e as etapas autorizadas — é o que o painel precisa editar.
 */
export async function getPanelProductDetail(slug: string): Promise<PanelProductDetail | null> {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      tagline: products.tagline,
      description: products.description,
      status: products.status,
      illustrationKey: products.illustrationKey,
      keywords: products.keywords,
      specifications: products.specifications,
      categorySlug: categories.slug,
      variantId: productVariants.id,
      sku: productVariants.sku,
      priceInCents: productVariants.priceCents,
      compareAtPriceInCents: productVariants.compareAtPriceCents,
      maxPerOrder: productVariants.maxPerOrder,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
    .leftJoin(productCategories, eq(productCategories.productId, products.id))
    .leftJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row || !row.variantId) return null;

  const stageRows = await db
    .select({ slug: schoolStages.slug })
    .from(programItemStages)
    .innerJoin(programItems, eq(programItems.id, programItemStages.programItemId))
    .innerJoin(variantProgramItems, eq(variantProgramItems.programItemId, programItems.id))
    .innerJoin(schoolStages, eq(schoolStages.id, programItemStages.stageId))
    .where(eq(variantProgramItems.variantId, row.variantId));

  const mediaRows = await db
    .select({
      id: productMedia.id,
      objectKey: productMedia.objectKey,
      altText: productMedia.altText,
      sortOrder: productMedia.sortOrder,
    })
    .from(productMedia)
    .where(eq(productMedia.productId, row.id))
    .orderBy(asc(productMedia.sortOrder));

  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    tagline: row.tagline,
    description: row.description,
    status: row.status,
    illustrationKey: row.illustrationKey,
    keywords: row.keywords,
    specifications: row.specifications,
    categorySlug: row.categorySlug,
    sku: row.sku ?? '',
    priceInCents: row.priceInCents ?? 0,
    compareAtPriceInCents: row.compareAtPriceInCents,
    maxPerOrder: row.maxPerOrder ?? 1,
    onHand: row.onHand ?? 0,
    reserved: row.reserved ?? 0,
    stageSlugs: [...new Set(stageRows.map((stage) => stage.slug))],
    media: mediaRows,
  };
}
