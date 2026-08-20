import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * Acesso ao catálogo.
 *
 * Este é o único módulo que sabe de onde os produtos vêm. As páginas continuam
 * chamando `listProducts` e `getProductBySlug`; o PostgreSQL e o formato físico
 * das tabelas ficam contidos aqui.
 */

import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '../../db/client';
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
} from '../../db/schema';
import { EDUCATION_STAGES, MATERIAL_ESCOLAR_YEAR } from '../program/material-escolar';
import { CATEGORIES, isCategorySlug } from './categories';
import {
  getAvailability,
  toCartProduct,
  type CartProduct,
  type CategorySlug,
  type IllustrationKey,
  type Product,
  type ProductSpec,
} from './product';
import { type CatalogQuery, scoreProduct } from './query';

const DEVELOPMENT_CATALOG_VERSION = 'development-seed';

function developmentCatalogAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEVELOPMENT_CATALOG === 'true';
}

const ILLUSTRATION_KEYS = new Set<IllustrationKey>([
  'caderno',
  'bloco',
  'papel',
  'lapis',
  'caneta',
  'borracha',
  'apontador',
  'marcador',
  'lapis-cor',
  'giz-cera',
  'canetinha',
  'tinta',
  'pincel',
  'massinha',
  'tesoura',
  'cola',
  'regua',
  'compasso',
  'mochila',
  'estojo',
  'pasta',
  'agenda',
]);

type EffectiveProgramCatalog = {
  id: string;
  developmentSeed: boolean;
};

function illustrationKey(value: string | null, slug: string): IllustrationKey {
  if (!value || !ILLUSTRATION_KEYS.has(value as IllustrationKey)) {
    throw new Error(`Produto ativo com ilustração inválida: ${slug}.`);
  }
  return value as IllustrationKey;
}

function productSpecifications(value: unknown, slug: string): ProductSpec[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as Record<string, unknown>).label !== 'string' ||
        typeof (entry as Record<string, unknown>).value !== 'string',
    )
  ) {
    throw new Error(`Produto ativo com especificações inválidas: ${slug}.`);
  }

  return value.map((entry) => ({
    label: (entry as ProductSpec).label,
    value: (entry as ProductSpec).value,
  }));
}

async function getEffectiveProgramCatalog(): Promise<EffectiveProgramCatalog | null> {
  const today = sql<string>`current_date`;
  const [published] = await db
    .select({ id: programCatalogs.id })
    .from(programCatalogs)
    .where(
      and(
        eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
        eq(programCatalogs.sourceKind, 'official'),
        eq(programCatalogs.status, 'published'),
        or(isNull(programCatalogs.validFrom), lte(programCatalogs.validFrom, today)),
        or(isNull(programCatalogs.validUntil), gte(programCatalogs.validUntil, today)),
      ),
    )
    .orderBy(desc(programCatalogs.publishedAt), desc(programCatalogs.id))
    .limit(1);

  if (published) return { id: published.id, developmentSeed: false };

  if (!developmentCatalogAllowed()) return null;

  /*
   * Transitional development data. It is deliberately selected by both
   * source kind and version, remains draft/unapproved in the database and must
   * be removed as a launch gate once the official catalog is published.
   */
  const [development] = await db
    .select({ id: programCatalogs.id })
    .from(programCatalogs)
    .where(
      and(
        eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
        eq(programCatalogs.sourceKind, 'development_seed'),
        eq(programCatalogs.version, DEVELOPMENT_CATALOG_VERSION),
        eq(programCatalogs.status, 'draft'),
      ),
    )
    .orderBy(desc(programCatalogs.updatedAt), desc(programCatalogs.id))
    .limit(1);

  return development ? { id: development.id, developmentSeed: true } : null;
}

async function getStagesByVariant(
  catalog: EffectiveProgramCatalog | null,
): Promise<Map<string, string[]>> {
  if (!catalog) return new Map();

  const rows = await db
    .select({
      variantId: variantProgramItems.variantId,
      stageSlug: schoolStages.slug,
    })
    .from(variantProgramItems)
    .innerJoin(programItems, eq(programItems.id, variantProgramItems.programItemId))
    .innerJoin(programItemStages, eq(programItemStages.programItemId, programItems.id))
    .innerJoin(schoolStages, eq(schoolStages.id, programItemStages.stageId))
    .innerJoin(
      programCatalogStages,
      and(
        eq(programCatalogStages.catalogId, programItems.catalogId),
        eq(programCatalogStages.stageId, schoolStages.id),
      ),
    )
    .where(
      and(
        eq(programItems.catalogId, catalog.id),
        eq(schoolStages.isActive, true),
        catalog.developmentSeed ? undefined : eq(variantProgramItems.isApproved, true),
      ),
    )
    .orderBy(asc(schoolStages.sortOrder), asc(schoolStages.slug));

  const stagesByVariant = new Map<string, string[]>();
  for (const row of rows) {
    const stages = stagesByVariant.get(row.variantId) ?? [];
    if (!stages.includes(row.stageSlug)) stages.push(row.stageSlug);
    stagesByVariant.set(row.variantId, stages);
  }
  return stagesByVariant;
}

async function loadCatalog(): Promise<Product[]> {
  const [rows, effectiveCatalog] = await Promise.all([
    db
      .select({
        variantId: productVariants.id,
        slug: products.slug,
        sku: productVariants.sku,
        name: products.name,
        brand: products.brand,
        category: categories.slug,
        illustration: products.illustrationKey,
        tagline: products.tagline,
        description: products.description,
        priceInCents: productVariants.priceCents,
        compareAtPriceInCents: productVariants.compareAtPriceCents,
        maxPerOrder: productVariants.maxPerOrder,
        specifications: products.specifications,
        keywords: products.keywords,
        onHand: inventoryItems.onHand,
        reserved: inventoryItems.reserved,
      })
      .from(products)
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.productId, products.id),
          eq(productVariants.isDefault, true),
          eq(productVariants.status, 'active'),
        ),
      )
      .innerJoin(
        productCategories,
        and(eq(productCategories.productId, products.id), eq(productCategories.isPrimary, true)),
      )
      .innerJoin(
        categories,
        and(eq(categories.id, productCategories.categoryId), eq(categories.isActive, true)),
      )
      .leftJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
      .where(eq(products.status, 'active'))
      .orderBy(asc(products.sortOrder), asc(products.id)),
    getEffectiveProgramCatalog(),
  ]);

  const stagesByVariant = await getStagesByVariant(effectiveCatalog);

  if (!effectiveCatalog) return [];

  return rows.flatMap((row): Product[] => {
    if (!isCategorySlug(row.category)) {
      throw new Error(`Produto ativo com categoria inválida: ${row.slug}.`);
    }

    const stages = stagesByVariant.get(row.variantId) ?? [];
    if (stages.length === 0) return [];

    return [
      {
        slug: row.slug,
        sku: row.sku,
        name: row.name,
        brand: row.brand,
        category: row.category,
        illustration: illustrationKey(row.illustration, row.slug),
        tagline: row.tagline,
        description: row.description,
        priceInCents: row.priceInCents,
        ...(row.compareAtPriceInCents === null
          ? {}
          : { compareAtPriceInCents: row.compareAtPriceInCents }),
        stages,
        stock: Math.max(0, (row.onHand ?? 0) - (row.reserved ?? 0)),
        maxPerOrder: row.maxPerOrder,
        specs: productSpecifications(row.specifications, row.slug),
        keywords: [...row.keywords],
      },
    ];
  });
}

export type CategoryFacet = {
  slug: CategorySlug;
  count: number;
};

export type CatalogResult = {
  items: Product[];
  /** Total após os filtros — o que a interface mostra como "N materiais". */
  total: number;
  /** Total do catálogo sem filtro nenhum, para o texto "de N". */
  totalUnfiltered: number;
  /**
   * Contagem por categoria calculada com todos os outros filtros aplicados,
   * mas ignorando o próprio filtro de categoria. É o que faz o número ao lado
   * do chip responder à busca sem zerar as outras opções ao marcar uma.
   */
  categoryFacets: CategoryFacet[];
  /** Faixa de preço do resultado atual, para o controle de valor máximo. */
  priceRange: { minInCents: number; maxInCents: number };
};

function matchesStage(product: Product, stage: string | null): boolean {
  if (!stage) return true;
  return product.stages.includes(stage);
}

function matchesCategory(product: Product, categories: CategorySlug[]): boolean {
  if (categories.length === 0) return true;
  return categories.includes(product.category);
}

function matchesPrice(product: Product, maxPriceInCents: number | null): boolean {
  if (maxPriceInCents === null) return true;
  return product.priceInCents <= maxPriceInCents;
}

function matchesStock(product: Product, inStockOnly: boolean): boolean {
  if (!inStockOnly) return true;
  return product.stock > 0;
}

function compareByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name, 'pt-BR');
}

/**
 * Ordena o resultado. Em qualquer ordenação, item esgotado cai para o fim:
 * ninguém quer abrir o catálogo e encontrar primeiro o que não pode comprar.
 */
function sortProducts(items: Product[], query: CatalogQuery): Product[] {
  const scores = new Map(items.map((item) => [item.slug, scoreProduct(item, query.search)]));

  return [...items].sort((a, b) => {
    const aOut = a.stock <= 0 ? 1 : 0;
    const bOut = b.stock <= 0 ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;

    switch (query.sort) {
      case 'preco-asc':
        return a.priceInCents - b.priceInCents || compareByName(a, b);
      case 'preco-desc':
        return b.priceInCents - a.priceInCents || compareByName(a, b);
      case 'nome':
        return compareByName(a, b);
      case 'relevancia':
      default: {
        if (query.search) {
          const diff = (scores.get(b.slug) ?? 0) - (scores.get(a.slug) ?? 0);
          if (diff !== 0) return diff;
        }
        // Sem busca, "relevante" é o que a loja quer destacar: item em oferta
        // primeiro, depois o mais barato, que é o que abre a lista escolar.
        const aPromo = a.compareAtPriceInCents ? 0 : 1;
        const bPromo = b.compareAtPriceInCents ? 0 : 1;
        if (aPromo !== bPromo) return aPromo - bPromo;
        return a.priceInCents - b.priceInCents || compareByName(a, b);
      }
    }
  });
}

function computePriceRange(items: Product[]): CatalogResult['priceRange'] {
  if (items.length === 0) return { minInCents: 0, maxInCents: 0 };
  let min = Infinity;
  let max = 0;
  for (const item of items) {
    if (item.priceInCents < min) min = item.priceInCents;
    if (item.priceInCents > max) max = item.priceInCents;
  }
  return { minInCents: min, maxInCents: max };
}

export async function listProducts(query: CatalogQuery): Promise<CatalogResult> {
  const catalog = await loadCatalog();

  // Filtros que não dependem da categoria — a base das facetas.
  const beforeCategory = catalog.filter(
    (product) =>
      matchesStage(product, query.stage) &&
      matchesPrice(product, query.maxPriceInCents) &&
      matchesStock(product, query.inStockOnly) &&
      (query.search === '' || scoreProduct(product, query.search) > 0),
  );

  const filtered = beforeCategory.filter((product) => matchesCategory(product, query.categories));

  const categoryFacets: CategoryFacet[] = CATEGORIES.map((category) => ({
    slug: category.slug,
    count: beforeCategory.filter((product) => product.category === category.slug).length,
  }));

  return {
    items: sortProducts(filtered, query),
    total: filtered.length,
    totalUnfiltered: catalog.length,
    categoryFacets,
    // A faixa vem de antes do corte de preço, senão o controle encolheria a
    // cada ajuste e o visitante não conseguiria afrouxar o próprio filtro.
    priceRange: computePriceRange(
      catalog.filter(
        (product) =>
          matchesStage(product, query.stage) && matchesCategory(product, query.categories),
      ),
    ),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const catalog = await loadCatalog();
  return catalog.find((product) => product.slug === slug) ?? null;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const catalog = await loadCatalog();
  return catalog.map((product) => product.slug);
}

/**
 * Itens para a vitrine da home: um por categoria, priorizando oferta e estoque
 * saudável, para que a seleção nunca vire uma prateleira só de cadernos.
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const catalog = await loadCatalog();
  const byCategory = new Map<CategorySlug, Product[]>(
    CATEGORIES.map((category) => [category.slug, []]),
  );

  for (const product of catalog) {
    if (getAvailability(product) === 'out-of-stock') continue;
    const bucket = byCategory.get(product.category) ?? [];
    bucket.push(product);
    byCategory.set(product.category, bucket);
  }

  for (const bucket of byCategory.values()) {
    bucket.sort((a, b) => {
      const aPromo = a.compareAtPriceInCents ? 0 : 1;
      const bPromo = b.compareAtPriceInCents ? 0 : 1;
      if (aPromo !== bPromo) return aPromo - bPromo;
      return b.stock - a.stock;
    });
  }

  // Percorre as categorias em rodadas, pegando o melhor de cada uma por vez.
  const featured: Product[] = [];
  const buckets = [...byCategory.values()];
  let round = 0;
  while (featured.length < limit) {
    const before = featured.length;
    for (const bucket of buckets) {
      const candidate = bucket[round];
      if (candidate) featured.push(candidate);
      if (featured.length >= limit) break;
    }
    if (featured.length === before) break;
    round += 1;
  }

  return featured.slice(0, limit);
}

/**
 * Relacionados: mesma categoria primeiro, depois itens que servem às mesmas
 * etapas. Nunca devolve o próprio produto nem item esgotado.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const catalog = await loadCatalog();
  const stageSet = new Set(product.stages);

  const candidates = catalog.filter((other) => other.slug !== product.slug && other.stock > 0);

  const scored = candidates.map((other) => {
    const sharedStages = other.stages.filter((stage) => stageSet.has(stage)).length;
    const sameCategory = other.category === product.category ? 1 : 0;
    // Preço próximo desempata: o acessório de R$ 9 combina melhor com um item
    // de R$ 14 do que a mochila de R$ 189.
    const priceDistance = Math.abs(other.priceInCents - product.priceInCents);
    return { other, sameCategory, sharedStages, priceDistance };
  });

  scored.sort(
    (a, b) =>
      b.sameCategory - a.sameCategory ||
      b.sharedStages - a.sharedStages ||
      a.priceDistance - b.priceDistance,
  );

  return scored.slice(0, limit).map((entry) => entry.other);
}

/**
 * Recarrega os produtos de um carrinho a partir dos slugs guardados no
 * navegador. O carrinho do visitante nunca é fonte de preço nem de estoque —
 * ele guarda apenas o que foi escolhido, e o servidor devolve os dados atuais.
 */
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const catalog = await loadCatalog();
  const wanted = new Set(slugs);
  return catalog.filter((product) => wanted.has(product.slug));
}

/** Etapas que têm ao menos um item autorizado — evita levar a um resultado vazio. */
export async function getStagesWithProducts() {
  const catalog = await loadCatalog();
  return EDUCATION_STAGES.filter((stage) =>
    catalog.some((product) => product.stages.includes(stage.slug)),
  );
}

/**
 * O catálogo na forma enxuta que o carrinho usa no cliente. Vai inteiro porque
 * o visitante pode ter qualquer item guardado do acesso anterior, e recarregar
 * item a item exigiria uma ida ao servidor por linha.
 */
export async function getCartProducts(): Promise<CartProduct[]> {
  const catalog = await loadCatalog();
  return catalog.map(toCartProduct);
}

/**
 * Etiqueta única do catálogo em cache.
 *
 * Quem grava algo que aparece aqui — o painel ao salvar produto, ajustar
 * estoque ou importar planilha, o painel ao confirmar pagamento (que baixa
 * `on_hand`) e o checkout ao reservar — precisa chamar
 * `revalidateTag(CATALOG_CACHE_TAG, 'max')`. `revalidatePath` sozinho não
 * alcança esta entrada.
 */
export const CATALOG_CACHE_TAG = 'catalog';

/**
 * A mesma lista, servida de cache.
 *
 * O layout público precisa do catálogo enxuto em toda página — inclusive em
 * `/privacy` e `/terms`, que são texto fixo. Buscar isso do banco a cada
 * acesso obrigava o site inteiro a renderizar dinamicamente: nada podia ser
 * pré-renderizado, e cada visita virava uma consulta ao Neon.
 *
 * Aqui a lista é compartilhada entre requisições e invalidada por etiqueta
 * quando o painel grava. O que se perde é até um minuto de defasagem em
 * preço e estoque exibidos — e isso não decide nada: o checkout relê o
 * catálogo direto do banco (`getCartProducts`) e refaz as contas antes de
 * gravar o pedido.
 */
export const getCachedCartProducts = unstable_cache(getCartProducts, ['cart-products'], {
  tags: [CATALOG_CACHE_TAG],
  revalidate: 60,
});
