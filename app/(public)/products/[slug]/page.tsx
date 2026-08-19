import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, GraduationCap, ShieldCheck } from 'lucide-react';

import { ProductIllustration } from '../../../components/product-illustration';
import { ProductCard } from '../../../components/shop/product-card';
import { ProductPurchase } from '../../../components/shop/product-purchase';
import { TrackEvent } from '../../../components/track-event';
import { Container } from '../../../components/ui/container';
import { CATEGORY_TONE_CLASSES, getCategory } from '../../../../src/lib/catalog/categories';
import { getAvailability } from '../../../../src/lib/catalog/product';
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from '../../../../src/lib/catalog/repository';
import { getEducationStage } from '../../../../src/lib/program/material-escolar';
import { env } from '../../../../src/config/env';
import { cn } from '../../../../src/lib/cn';

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Material não encontrado' };

  return {
    title: product.name,
    description: `${product.tagline}. ${product.description}`.slice(0, 300),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} — Balaio de Gato`,
      description: product.tagline,
      url: `${env.siteUrl}/products/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = await getRelatedProducts(product, 4);
  const availability = getAvailability(product);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    category: category?.name,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: (product.priceInCents / 100).toFixed(2),
      availability:
        availability === 'out-of-stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: `${env.siteUrl}/products/${product.slug}`,
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <TrackEvent step="product_view" />

      <Container size="wide" className="pt-6 pb-4">
        <nav aria-label="Você está em">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-bold text-[rgb(var(--muted))]">
            <li>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
              >
                Início
              </Link>
            </li>
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            <li>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
              >
                Materiais
              </Link>
            </li>
            {category ? (
              <>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
                <li>
                  <Link
                    href={`/products?categoria=${category.slug}`}
                    className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
                  >
                    {category.shortName}
                  </Link>
                </li>
              </>
            ) : null}
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            <li aria-current="page" className="text-[rgb(var(--fg))]">
              {product.name}
            </li>
          </ol>
        </nav>
      </Container>

      <Container size="wide" className="pb-14 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <div className="relative overflow-hidden rounded-[2rem] border border-[rgb(var(--border))] shadow-[0_20px_60px_rgba(24,50,77,0.08)]">
              <div className="aspect-square">
                <ProductIllustration illustration={product.illustration} seed={product.slug} />
              </div>
              {category ? (
                <span
                  className={cn(
                    'absolute top-5 left-5 rounded-full px-3 py-1.5 text-xs font-bold',
                    CATEGORY_TONE_CLASSES[category.tone],
                  )}
                >
                  {category.name}
                </span>
              ) : null}
            </div>

            <p className="mt-4 text-center text-[11px] leading-5 text-[rgb(var(--muted))]">
              Ilustração do tipo de material. A foto do produto real será publicada em breve.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-[rgb(var(--muted))] uppercase">
              {product.brand} · {product.sku}
            </p>
            <h1 className="font-display mt-2 text-3xl leading-[1.1] font-extrabold text-balance md:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-base leading-7 text-[rgb(var(--muted))]">{product.tagline}</p>

            <div className="mt-7">
              <ProductPurchase product={product} />
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-extrabold">Sobre este material</h2>
              <p className="mt-3 text-sm leading-7 text-[rgb(var(--muted))]">
                {product.description}
              </p>
            </div>

            {product.specs.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-sm font-extrabold">Especificações</h2>
                <dl className="mt-4 overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
                  {product.specs.map((spec, index) => (
                    <div
                      key={spec.label}
                      className={cn(
                        'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3.5',
                        index % 2 === 0 ? 'bg-white' : 'bg-[rgb(var(--surface-muted))]/60',
                      )}
                    >
                      <dt className="text-xs font-bold text-[rgb(var(--muted))]">{spec.label}</dt>
                      <dd className="text-sm font-bold">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <StageEligibility stages={product.stages} />

            <p className="mt-8 flex items-start gap-2.5 rounded-2xl bg-[rgb(var(--sage-soft))] p-4 text-xs leading-5 font-semibold text-[rgb(var(--sage-ink))]">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />A loja nunca pede
              a senha nem o código do cartão virtual do Kit Escolar — pelo site, telefone ou
              mensagem.
            </p>
          </div>
        </div>
      </Container>

      {related.length > 0 ? (
        <section className="border-t border-[rgb(var(--border))] bg-white/55">
          <Container size="wide" className="py-14 md:py-18">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">
                Costuma ir junto na lista
              </h2>
              <Link
                href="/products"
                className="text-sm font-extrabold text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
              >
                Ver todo o catálogo
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </main>
  );
}

function StageEligibility({ stages }: { stages: readonly string[] }) {
  const resolved = stages
    .map((slug) => getEducationStage(slug))
    .filter((stage) => stage !== undefined);

  if (resolved.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <GraduationCap aria-hidden="true" className="size-4 text-[rgb(var(--accent))]" />
        Autorizado para estas etapas
      </h2>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
        Compras com o crédito do Kit Escolar levam somente itens autorizados para o ano do
        estudante.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {resolved.map((stage) => (
          <li key={stage.slug}>
            <Link
              href={`/products?etapa=${stage.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-[rgb(var(--border))] bg-white px-3 py-1.5 text-xs font-bold transition hover:border-[rgb(var(--accent))]/50 hover:text-[rgb(var(--accent))]"
            >
              {stage.shortName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
