export type CatalogSort = 'featured' | 'newest' | 'price_asc' | 'price_desc';

export type CatalogAvailability = 'all' | 'available';

export function parseCatalogSort(value: string | undefined): CatalogSort {
  if (value === 'newest' || value === 'price_asc' || value === 'price_desc') {
    return value;
  }

  return 'featured';
}

export function parseCatalogAvailability(value: string | undefined): CatalogAvailability {
  return value === 'available' ? 'available' : 'all';
}

export function parseCatalogPrice(value: string | undefined) {
  if (!value) return undefined;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    return undefined;
  }

  return Math.round(amount * 100) / 100;
}

export function normalizeCatalogSearch(value: string | undefined) {
  if (!value) return '';

  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s'&-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function formatFilterPrice(amount: number) {
  return amount.toFixed(2);
}

export function buildProductQuery(filters: {
  availability: CatalogAvailability;
  minPrice?: number;
  maxPrice?: number;
}) {
  const terms: string[] = [];

  if (filters.availability === 'available') {
    terms.push('available_for_sale:true');
  }
  if (filters.minPrice !== undefined) {
    terms.push(`variants.price:>=${formatFilterPrice(filters.minPrice)}`);
  }
  if (filters.maxPrice !== undefined) {
    terms.push(`variants.price:<=${formatFilterPrice(filters.maxPrice)}`);
  }

  return terms.length > 0 ? terms.join(' AND ') : undefined;
}

export function normalizePriceRange(minPrice?: number, maxPrice?: number) {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { minPrice: maxPrice, maxPrice: minPrice };
  }

  return { minPrice, maxPrice };
}
