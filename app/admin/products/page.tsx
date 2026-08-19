import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Plus, Upload } from 'lucide-react';

import {
  computeCatalogStats,
  listPanelProducts,
  type PanelProduct,
} from '../../../src/lib/panel/products';
import { PageHeader, StatCard } from '../_components/ui';
import { ProductsManager } from './products-manager';

export const metadata: Metadata = { title: 'Products — 801 Outlet Panel' };

type Filters = {
  q?: string;
  status?: string;
  stock?: string;
};

function applyFilters(products: PanelProduct[], filters: Filters): PanelProduct[] {
  let result = products;
  if (filters.status && ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(filters.status)) {
    result = result.filter((product) => product.status === filters.status);
  }
  if (filters.stock === 'low') {
    result = result.filter((product) =>
      product.variants.some((variant) => variant.inventoryQuantity <= 2),
    );
  }
  if (filters.stock === 'out') {
    result = result.filter(
      (product) =>
        product.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0) <= 0,
    );
  }
  return result;
}

export default async function PanelProductsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) || undefined;
  const all = await listPanelProducts(search);
  const stats = computeCatalogStats(all);
  const products = applyFilters(all, params);
  const hasFilters = Boolean(params.status || params.stock || search);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CATALOG"
        title="Products"
        titleAccent={`(${products.length})`}
        subtitle="Edit prices, stock and visibility inline, or update in bulk with a spreadsheet."
        actions={
          <>
            {/* Route handler (CSV download), not a page — the [id] route makes
                the lint rule think otherwise. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/admin/products/export"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </a>
            <Link
              href="/admin/products/import"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
            >
              <Upload aria-hidden="true" className="size-4" />
              Import CSV
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-4 text-sm font-semibold text-white transition hover:bg-[rgb(var(--fg))]/90"
            >
              <Plus aria-hidden="true" className="size-4" />
              New product
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Total" value={String(stats.total)} href="/admin/products" />
        <StatCard
          title="Active"
          value={String(stats.active)}
          href="/admin/products?status=ACTIVE"
        />
        <StatCard title="Drafts" value={String(stats.draft)} href="/admin/products?status=DRAFT" />
        <StatCard
          title="Out of stock"
          value={String(stats.outOfStock)}
          sub="active products"
          href="/admin/products?stock=out"
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-2 rounded-3xl border border-[rgb(var(--border))] bg-white p-3"
      >
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search ?? ''}
          placeholder="Search by title…"
          className="min-h-10 w-full flex-1 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm transition outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15 sm:w-auto"
        />
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={params.status ?? ''}
          className="min-h-10 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm outline-none"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <label htmlFor="stock" className="sr-only">
          Stock
        </label>
        <select
          id="stock"
          name="stock"
          defaultValue={params.stock ?? ''}
          className="min-h-10 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm outline-none"
        >
          <option value="">Any stock</option>
          <option value="low">Low stock (≤ 2)</option>
          <option value="out">Out of stock</option>
        </select>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-full bg-[rgb(var(--fg))] px-5 text-sm font-semibold text-white transition hover:bg-[rgb(var(--fg))]/90"
        >
          Apply
        </button>
        {hasFilters ? (
          <Link
            href="/admin/products"
            className="text-xs font-semibold text-[rgb(var(--sage-ink))] hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      <ProductsManager products={products} />
    </div>
  );
}
