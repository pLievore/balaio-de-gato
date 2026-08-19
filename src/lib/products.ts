import { supabase } from './supabase/client';

export type ProductImage = {
  url: string;
  alt: string | null;
};

export type ProductCardData = {
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  stockQty: number;
  images: ProductImage[];
};

export type ProductDetailData = ProductCardData & {
  variantId: string;
  sku: string;
  attributes: Record<string, unknown>;
};

export type CategoryRef = {
  slug: string;
  name: string;
};

const PRODUCT_LIST_SELECT = `
  slug,
  name,
  description,
  product_variants ( id, sku, price_cents, compare_at_price_cents, stock_qty, attributes, is_default ),
  product_images ( url, alt, sort_order )
` as const;

type RawProductRow = {
  slug: string;
  name: string;
  description: string | null;
  product_variants: Array<{
    id: string;
    sku: string;
    price_cents: number;
    compare_at_price_cents: number | null;
    stock_qty: number;
    attributes: unknown;
    is_default: boolean;
  }>;
  product_images: Array<{
    url: string;
    alt: string | null;
    sort_order: number;
  }>;
};

function pickDefaultVariant(p: RawProductRow) {
  return p.product_variants.find((v) => v.is_default) ?? p.product_variants[0];
}

function sortImages(p: RawProductRow): ProductImage[] {
  return [...p.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, alt: i.alt }));
}

function toCard(p: RawProductRow): ProductCardData {
  const v = pickDefaultVariant(p);
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceCents: v?.price_cents ?? 0,
    compareAtPriceCents: v?.compare_at_price_cents ?? null,
    stockQty: v?.stock_qty ?? 0,
    images: sortImages(p),
  };
}

/**
 * List active products, optionally filtered by category slug.
 * Pass `category` = `'all'` or `undefined` to skip the filter.
 */
export async function getActiveProducts(options?: {
  category?: string;
}): Promise<ProductCardData[]> {
  let allowedIds: string[] | null = null;

  if (options?.category && options.category !== 'all') {
    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', options.category)
      .maybeSingle();
    if (catErr) throw catErr;
    if (!cat) return [];

    const { data: pcs, error: pcErr } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', cat.id);
    if (pcErr) throw pcErr;
    allowedIds = (pcs ?? []).map((pc) => pc.product_id);
    if (allowedIds.length === 0) return [];
  }

  let query = supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (allowedIds) {
    query = query.in('id', allowedIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toCard(row as unknown as RawProductRow));
}

export async function getProductBySlug(slug: string): Promise<ProductDetailData | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as RawProductRow;
  const card = toCard(raw);
  const v = pickDefaultVariant(raw);
  return {
    ...card,
    variantId: v?.id ?? '',
    sku: v?.sku ?? '',
    attributes:
      v && typeof v.attributes === 'object' && v.attributes !== null
        ? (v.attributes as Record<string, unknown>)
        : {},
  };
}

/**
 * Server-side stock check used during cart validation and at checkout.
 * Returns null if variant doesn't exist or its product is not active.
 */
export async function getVariantForCart(variantId: string): Promise<{
  id: string;
  sku: string;
  productName: string;
  variantName: string;
  productSlug: string;
  unitPriceCents: number;
  stockQty: number;
} | null> {
  const { data, error } = await supabase
    .from('product_variants')
    .select(
      `id, sku, name, price_cents, stock_qty,
       products!inner ( slug, name, status )`,
    )
    .eq('id', variantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    sku: string;
    name: string;
    price_cents: number;
    stock_qty: number;
    products: { slug: string; name: string; status: string } | null;
  };

  if (!row.products || row.products.status !== 'active') return null;

  return {
    id: row.id,
    sku: row.sku,
    productName: row.products.name,
    variantName: row.name,
    productSlug: row.products.slug,
    unitPriceCents: row.price_cents,
    stockQty: row.stock_qty,
  };
}

export async function getAllActiveProductSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('products').select('slug').eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map((p) => p.slug);
}

export async function getRecentProducts(limit = 8): Promise<ProductCardData[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => toCard(row as unknown as RawProductRow));
}

export async function getRelatedProducts(
  currentSlug: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const { data: currentRaw, error: cErr } = await supabase
    .from('products')
    .select('id, product_categories ( category_id )')
    .eq('slug', currentSlug)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!currentRaw) return [];

  const current = currentRaw as unknown as {
    id: string;
    product_categories: Array<{ category_id: string }>;
  };

  const cats = current.product_categories ?? [];
  if (cats.length === 0) return [];
  const categoryIds = cats.map((pc) => pc.category_id);

  const { data: pcs, error: pcErr } = await supabase
    .from('product_categories')
    .select('product_id')
    .in('category_id', categoryIds)
    .neq('product_id', current.id);
  if (pcErr) throw pcErr;

  const productIds = [...new Set((pcs ?? []).map((pc) => pc.product_id))];
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('status', 'active')
    .in('id', productIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => toCard(row as unknown as RawProductRow));
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export type SearchFilters = {
  q?: string;
  category?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export type SearchResult = {
  products: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function sanitizeSearchTerm(q: string): string {
  return q
    .trim()
    .replace(/[%,()'"]/g, '')
    .slice(0, 100);
}

/**
 * Search active products with text/category/price filters, sort, and pagination.
 * Filtering by price and sorting by price are done in JS over the result set —
 * acceptable up to a few thousand products. Move to a SQL view if scale grows.
 */
export async function searchActiveProducts(filters: SearchFilters = {}): Promise<SearchResult> {
  let allowedIds: string[] | null = null;
  if (filters.category && filters.category !== 'all') {
    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .maybeSingle();
    if (catErr) throw catErr;
    if (!cat) {
      return emptyResult(filters);
    }

    const { data: pcs, error: pcErr } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', cat.id);
    if (pcErr) throw pcErr;
    allowedIds = (pcs ?? []).map((pc) => pc.product_id);
    if (allowedIds.length === 0) return emptyResult(filters);
  }

  let query = supabase.from('products').select(PRODUCT_LIST_SELECT).eq('status', 'active');

  if (allowedIds) query = query.in('id', allowedIds);

  if (filters.q) {
    const term = sanitizeSearchTerm(filters.q);
    if (term.length > 0) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let cards = (data ?? []).map((row) => toCard(row as unknown as RawProductRow));

  if (typeof filters.priceMinCents === 'number') {
    cards = cards.filter((c) => c.priceCents >= filters.priceMinCents!);
  }
  if (typeof filters.priceMaxCents === 'number') {
    cards = cards.filter((c) => c.priceCents <= filters.priceMaxCents!);
  }

  switch (filters.sort) {
    case 'price_asc':
      cards.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case 'price_desc':
      cards.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case 'newest':
    default:
      // already ordered by created_at desc from the query
      break;
  }

  const total = cards.length;
  const pageSize = clamp(filters.pageSize ?? 12, 1, 48);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = clamp(filters.page ?? 1, 1, totalPages);
  const offset = (page - 1) * pageSize;

  return {
    products: cards.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function emptyResult(filters: SearchFilters): SearchResult {
  const pageSize = clamp(filters.pageSize ?? 12, 1, 48);
  return { products: [], total: 0, page: 1, pageSize, totalPages: 1 };
}

/**
 * Categories that have at least one active product, ordered by sort_order.
 */
export async function getCategoriesWithProducts(): Promise<CategoryRef[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select(
      `categories!inner ( slug, name, sort_order ),
       products!inner ( id, status )`,
    )
    .eq('products.status', 'active');

  if (error) throw error;

  type Row = {
    categories: { slug: string; name: string; sort_order: number } | null;
  };

  const seen = new Map<string, { slug: string; name: string; sort_order: number }>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const c = row.categories;
    if (c && !seen.has(c.slug)) seen.set(c.slug, c);
  }
  return [...seen.values()]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ slug: c.slug, name: c.name }));
}
