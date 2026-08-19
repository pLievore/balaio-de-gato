import 'server-only';

import { asc, count, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  categories,
  inventoryItems,
  productCategories,
  products,
  productVariants,
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
