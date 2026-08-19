import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';

import { getPanelProductDetail } from '../../../../src/lib/panel/catalog';
import { PageHeader, Panel } from '../../_components/ui';
import { ProductForm } from '../product-form';
import { MediaPanel, StockPanel } from './stock-and-media';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Painel Balaio de Gato` };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPanelProductDetail(decodeURIComponent(slug));
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Voltar aos produtos
      </Link>

      <PageHeader
        eyebrow="CATÁLOGO"
        title="Editar"
        titleAccent={product.name}
        subtitle={`SKU ${product.sku}`}
        actions={
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
          >
            Ver na loja
            <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Estoque">
          <StockPanel product={product} />
        </Panel>
        <Panel title="Imagens">
          <MediaPanel product={product} />
        </Panel>
      </div>

      <ProductForm product={product} />
    </div>
  );
}
