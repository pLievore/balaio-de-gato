import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageSearch, SlidersHorizontal } from 'lucide-react';

import {
  ActiveFilterChips,
  CatalogFilterDrawer,
  CatalogFilterRail,
  CatalogSearch,
  SortSelect,
} from '../../components/shop/catalog-filters';
import { CartCatalogProvider } from '../../components/shop/cart-catalog';
import { ProductCard } from '../../components/shop/product-card';
import { StageBenefitBanner } from '../../components/shop/stage-benefit-banner';
import { Container } from '../../components/ui/container';
import { buttonStyles } from '../../components/ui/button';
import { CATEGORIES } from '../../../src/lib/catalog/categories';
import { parseCatalogQuery } from '../../../src/lib/catalog/query';
import { getCachedCartProducts, listProducts } from '../../../src/lib/catalog/repository';
import { getEducationStage } from '../../../src/lib/program/material-escolar';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Metadata da listagem.
 *
 * O canonical era fixo em `/products` para qualquer combinação de filtro — e o
 * sitemap submete as seis categorias como `/products?categoria=<slug>`. O
 * Google lia as seis como duplicatas e descartava todas: uma loja cujo tráfego
 * de busca é "caderno" e "mochila escolar" ficava sem essas páginas no índice.
 *
 * Agora **uma** categoria sozinha ganha canonical próprio, com título e
 * descrição da categoria. Qualquer outra combinação — busca, preço, etapa,
 * duas categorias — continua apontando para `/products`: são recortes de
 * navegação, não páginas que mereçam índice próprio.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}): Promise<Metadata> {
  const query = parseCatalogQuery((await searchParams) ?? {});
  const soUmaCategoria =
    query.categories.length === 1 &&
    query.search === '' &&
    query.stage === null &&
    query.maxPriceInCents === null &&
    !query.inStockOnly;

  const categoria = soUmaCategoria
    ? CATEGORIES.find((entry) => entry.slug === query.categories[0])
    : undefined;

  if (!categoria) {
    return {
      title: 'Materiais escolares',
      description:
        'Cadernos, lápis, mochilas e todo o material da lista escolar, com pagamento pelo crédito do Kit Escolar da Prefeitura de São Paulo.',
      alternates: { canonical: '/products' },
    };
  }

  return {
    title: categoria.name,
    description: `${categoria.description} Pagamento pelo crédito do Kit Escolar da Prefeitura de São Paulo.`,
    alternates: { canonical: `/products?categoria=${categoria.slug}` },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const query = parseCatalogQuery(params);
  const stage = query.stage ? getEducationStage(query.stage) : undefined;
  const [result, cartProducts] = await Promise.all([
    listProducts(query),
    stage ? getCachedCartProducts() : Promise.resolve([]),
  ]);

  return (
    <main>
      <section className="border-b border-[rgb(var(--border))] bg-white/55">
        <Container size="wide" className="py-10 md:py-14">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Catálogo
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl leading-[1.05] font-extrabold md:text-5xl">
            Tudo da lista, num só balaio.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))] md:text-base">
            Busque pelo nome do material ou escolha o ano do estudante para ver somente o que está
            autorizado no crédito.
          </p>

          <div className="mt-7 max-w-2xl">
            <CatalogSearch query={query} />
          </div>
        </Container>
      </section>

      <Container size="wide" className="py-8 md:py-12">
        {stage ? (
          <CartCatalogProvider products={cartProducts}>
            <StageBenefitBanner stage={stage} className="mb-8" />
          </CartCatalogProvider>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-12">
          <CatalogFilterRail
            query={query}
            facets={result.categoryFacets}
            priceRange={result.priceRange}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-5">
              <p className="text-sm font-bold" aria-live="polite">
                <span className="tabular-nums-tight">{result.total}</span>{' '}
                {result.total === 1 ? 'material' : 'materiais'}
                {result.total !== result.totalUnfiltered ? (
                  <span className="font-semibold text-[rgb(var(--muted))]">
                    {' '}
                    de {result.totalUnfiltered}
                  </span>
                ) : null}
              </p>

              <div className="flex w-full flex-col gap-3 min-[360px]:w-auto min-[360px]:flex-row min-[360px]:items-center">
                <CatalogFilterDrawer
                  query={query}
                  facets={result.categoryFacets}
                  priceRange={result.priceRange}
                  total={result.total}
                />
                <SortSelect query={query} />
              </div>
            </div>

            <div className="pt-5">
              <ActiveFilterChips query={query} />
            </div>

            {result.items.length > 0 ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((product) => (
                  <li key={product.slug} className="h-full">
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyResult />
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}

function EmptyResult() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-muted))] px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-[rgb(var(--muted))]"
      >
        <PackageSearch className="size-7" />
      </span>
      <h2 className="font-display mt-5 text-2xl font-extrabold">
        Nenhum material com esses filtros.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[rgb(var(--muted))]">
        Tente outra palavra, amplie o preço máximo ou escolha mais de uma categoria.
      </p>
      <Link href="/products" className={buttonStyles({ size: 'md', className: 'mt-7' })}>
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Limpar os filtros
      </Link>
    </div>
  );
}
