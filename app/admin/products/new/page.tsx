import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { ProductForm } from '../product-form';
import { PageHeader } from '../../_components/ui';

export const metadata: Metadata = { title: 'Novo produto — Painel Balaio de Gato' };
export const dynamic = 'force-dynamic';

export default function NewProductPage() {
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
        title="Novo"
        titleAccent="produto"
        subtitle="Cadastre o material e marque as etapas que podem comprá-lo com o crédito."
      />

      <ProductForm />
    </div>
  );
}
