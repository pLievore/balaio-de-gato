/**
 * Tradução entre a URL e a consulta do catálogo.
 *
 * A URL é o único estado do filtro: quem compartilha um link compartilha o
 * resultado exato, e voltar no histórico devolve a busca anterior. Este módulo
 * é puro — nada de React, nada de dados — para poder ser testado sozinho.
 */

import { isCategorySlug } from './categories';
import type { CategorySlug, Product } from './product';

export type ProductSort = 'relevancia' | 'preco-asc' | 'preco-desc' | 'nome';

export const SORT_OPTIONS: readonly { value: ProductSort; label: string }[] = [
  { value: 'relevancia', label: 'Mais relevantes' },
  { value: 'preco-asc', label: 'Menor preço' },
  { value: 'preco-desc', label: 'Maior preço' },
  { value: 'nome', label: 'Nome (A–Z)' },
];

export type CatalogQuery = {
  /** Texto livre digitado na busca. */
  search: string;
  categories: CategorySlug[];
  /** Etapa de ensino escolhida; filtra por elegibilidade no programa. */
  stage: string | null;
  /** Teto de preço em centavos, quando o visitante limitou o valor. */
  maxPriceInCents: number | null;
  /** Esconde os itens esgotados. */
  inStockOnly: boolean;
  sort: ProductSort;
};

export const EMPTY_QUERY: CatalogQuery = {
  search: '',
  categories: [],
  stage: null,
  maxPriceInCents: null,
  inStockOnly: false,
  sort: 'relevancia',
};

/** Os nomes dos parâmetros ficam em português, porque a URL é pública. */
export const QUERY_KEYS = {
  search: 'busca',
  category: 'categoria',
  stage: 'etapa',
  maxPrice: 'ate',
  inStock: 'disponivel',
  sort: 'ordem',
} as const;

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  // `?categoria=arte,escrita` e `?categoria=arte&categoria=escrita` são
  // equivalentes; a primeira forma mantém a URL curta ao marcar várias.
  return list.flatMap((entry) => entry.split(',')).map((entry) => entry.trim());
}

function isSort(value: string | undefined): value is ProductSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function parseCatalogQuery(params: RawParams): CatalogQuery {
  const categories = allValues(params[QUERY_KEYS.category]).filter(isCategorySlug);
  const rawMaxPrice = firstValue(params[QUERY_KEYS.maxPrice]);
  const maxPriceInReais = rawMaxPrice ? Number(rawMaxPrice) : NaN;
  const sort = firstValue(params[QUERY_KEYS.sort]);

  return {
    search: (firstValue(params[QUERY_KEYS.search]) ?? '').trim(),
    // Um mesmo filtro marcado duas vezes não deve contar duas vezes.
    categories: [...new Set(categories)],
    stage: firstValue(params[QUERY_KEYS.stage]) ?? null,
    maxPriceInCents:
      Number.isFinite(maxPriceInReais) && maxPriceInReais > 0
        ? Math.round(maxPriceInReais * 100)
        : null,
    inStockOnly: firstValue(params[QUERY_KEYS.inStock]) === '1',
    sort: isSort(sort) ? sort : 'relevancia',
  };
}

/**
 * Serializa a consulta de volta para a URL, omitindo tudo que estiver no
 * padrão. Uma busca sem filtro devolve `/products` limpo, sem cauda de
 * parâmetros vazios.
 */
export function buildCatalogHref(query: CatalogQuery, pathname = '/products'): string {
  const params = new URLSearchParams();

  if (query.search) params.set(QUERY_KEYS.search, query.search);
  if (query.categories.length > 0) {
    params.set(QUERY_KEYS.category, query.categories.join(','));
  }
  if (query.stage) params.set(QUERY_KEYS.stage, query.stage);
  if (query.maxPriceInCents !== null) {
    params.set(QUERY_KEYS.maxPrice, String(Math.round(query.maxPriceInCents / 100)));
  }
  if (query.inStockOnly) params.set(QUERY_KEYS.inStock, '1');
  if (query.sort !== 'relevancia') params.set(QUERY_KEYS.sort, query.sort);

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function isQueryActive(query: CatalogQuery): boolean {
  return (
    query.search !== '' ||
    query.categories.length > 0 ||
    query.stage !== null ||
    query.maxPriceInCents !== null ||
    query.inStockOnly
  );
}

/** Quantos filtros estão ligados — alimenta o contador do botão no mobile. */
export function countActiveFilters(query: CatalogQuery): number {
  return (
    query.categories.length +
    (query.search ? 1 : 0) +
    (query.stage ? 1 : 0) +
    (query.maxPriceInCents !== null ? 1 : 0) +
    (query.inStockOnly ? 1 : 0)
  );
}

/**
 * Normaliza para busca: minúsculas e sem acento. Quem digita "lapis" ou
 * "caderno universitario" tem de encontrar "lápis" e "universitário" — é como
 * a maioria das pessoas realmente digita no celular.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Pontua o produto contra os termos buscados. Zero significa "não casou".
 * Casar no nome vale mais que casar na descrição, e o começo do nome vale mais
 * que o meio — assim "cola" traz a cola bastão antes do porta-lápis que apenas
 * menciona colagem.
 */
export function scoreProduct(product: Product, search: string): number {
  const terms = normalizeForSearch(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  const name = normalizeForSearch(product.name);
  const brand = normalizeForSearch(product.brand);
  const tagline = normalizeForSearch(product.tagline);
  const description = normalizeForSearch(product.description);
  const keywords = product.keywords.map(normalizeForSearch).join(' ');
  const sku = normalizeForSearch(product.sku);

  let total = 0;

  for (const term of terms) {
    let termScore = 0;

    if (name.startsWith(term)) termScore += 12;
    else if (name.includes(term)) termScore += 8;

    if (sku.includes(term)) termScore += 10;
    if (brand.includes(term)) termScore += 6;
    if (keywords.includes(term)) termScore += 5;
    if (tagline.includes(term)) termScore += 3;
    if (description.includes(term)) termScore += 1;

    // Um termo sem nenhuma correspondência invalida a busca inteira: quem
    // procura "caderno azul" não quer todo caderno que existe.
    if (termScore === 0) return 0;
    total += termScore;
  }

  return total;
}
