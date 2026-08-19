import 'server-only';

import type { CatalogAvailability, CatalogSort } from '../catalog/filters';
import { buildProductQuery } from '../catalog/filters';
import type { CatalogProductCard } from '../catalog/types';
import { adaptProductCard, type SearchProduct } from './adapters/products';
import { getProducts, searchProducts } from './queries/products';

type CatalogPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
};

function normalizePageInfo(pageInfo: {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor?: string | null;
  startCursor?: string | null;
}): CatalogPageInfo {
  return {
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    endCursor: pageInfo.endCursor ?? null,
    startCursor: pageInfo.startCursor ?? null,
  };
}

export type ShopifyCatalogPage = {
  products: CatalogProductCard[];
  totalCount: number | null;
  pageInfo: CatalogPageInfo;
};

export type ShopifyCatalogInput = {
  search: string;
  availability: CatalogAvailability;
  sort: CatalogSort;
  minPrice?: number;
  maxPrice?: number;
  after?: string;
  before?: string;
  pageSize?: number;
};

function paginationVariables(input: ShopifyCatalogInput) {
  const pageSize = Math.max(1, Math.min(input.pageSize ?? 12, 48));

  if (input.before) {
    return { last: pageSize, before: input.before };
  }

  return { first: pageSize, after: input.after };
}

function productSort(sort: CatalogSort) {
  switch (sort) {
    case 'newest':
      return { sortKey: 'CREATED_AT' as const, reverse: true };
    case 'price_asc':
      return { sortKey: 'PRICE' as const, reverse: false };
    case 'price_desc':
      return { sortKey: 'PRICE' as const, reverse: true };
    case 'featured':
    default:
      return { sortKey: 'BEST_SELLING' as const, reverse: false };
  }
}

function searchSort(sort: CatalogSort) {
  switch (sort) {
    case 'price_asc':
      return { sortKey: 'PRICE' as const, reverse: false };
    case 'price_desc':
      return { sortKey: 'PRICE' as const, reverse: true };
    default:
      return { sortKey: 'RELEVANCE' as const, reverse: false };
  }
}

function searchFilters(input: ShopifyCatalogInput) {
  const filters: Array<{
    available?: boolean;
    price?: { min?: number; max?: number };
  }> = [];

  if (input.availability === 'available') {
    filters.push({ available: true });
  }
  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    filters.push({
      price: { min: input.minPrice, max: input.maxPrice },
    });
  }

  return filters.length > 0 ? filters : undefined;
}

export async function getShopifyCatalogPage(
  input: ShopifyCatalogInput,
): Promise<ShopifyCatalogPage> {
  const pagination = paginationVariables(input);

  if (input.search) {
    const result = await searchProducts({
      query: input.search,
      ...pagination,
      ...searchSort(input.sort),
      productFilters: searchFilters(input),
    });
    const products = result.nodes.filter(
      (node): node is SearchProduct => node.__typename === 'Product',
    );

    return {
      products: products.map(adaptProductCard),
      totalCount: result.totalCount,
      pageInfo: normalizePageInfo(result.pageInfo),
    };
  }

  const result = await getProducts({
    ...pagination,
    ...productSort(input.sort),
    query: buildProductQuery(input),
  });

  return {
    products: result.nodes.map(adaptProductCard),
    totalCount: null,
    pageInfo: normalizePageInfo(result.pageInfo),
  };
}
