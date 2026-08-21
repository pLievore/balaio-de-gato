import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ExternalLink, Pencil, Plus, Search } from 'lucide-react';

import { getCatalogCounts, listPanelProducts } from '../../../src/lib/panel/catalog';
import { formatBRL } from '../../../src/lib/money';
import { PageHeader, Panel, StatCard } from '../_components/ui';

export const metadata: Metadata = { title: 'Produtos — Painel Balaio de Gato' };
export const dynamic = 'force-dynamic';

const STATUS_ROTULO: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  archived: 'Arquivado',
};

const STATUS_TOM: Record<string, string> = {
  active: 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
  draft: 'bg-amber-50 text-amber-800',
  archived: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]',
};

export default async function PanelProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ busca?: string; situacao?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const busca = params.busca?.trim() ?? '';
  const situacao = params.situacao ?? 'todos';

  const [produtos, contagens] = await Promise.all([
    listPanelProducts({ search: busca, status: situacao }),
    getCatalogCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CATÁLOGO"
        title="Produtos"
        titleAccent="e estoque"
        subtitle="O que a loja tem cadastrado, com o saldo disponível de cada item."
        actions={
          <div className="flex flex-wrap gap-2">
            {/* `prefetch={false}`: é um download, não uma página para pré-carregar. */}
            <Link
              href="/admin/products/export"
              prefetch={false}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
            >
              <Download aria-hidden="true" className="size-4" />
              Exportar CSV
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-4 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Plus aria-hidden="true" className="size-4" />
              Novo produto
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard title="Produtos" value={String(contagens.total)} />
        <StatCard title="Ativos" value={String(contagens.active)} />
        <StatCard title="Rascunhos" value={String(contagens.draft)} />
        <StatCard
          title="Sem disponibilidade"
          value={String(contagens.outOfStock)}
          accent={contagens.outOfStock > 0}
        />
      </div>

      <form method="get" role="search" className="relative max-w-md">
        <label htmlFor="busca-produto" className="sr-only">
          Buscar produto por nome
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[rgb(var(--muted))]"
        />
        <input
          id="busca-produto"
          name="busca"
          type="search"
          defaultValue={busca}
          placeholder="Nome ou slug do produto"
 className="min-h-11 w-full rounded-full border border-[rgb(var(--border))] bg-white pr-4 pl-11 text-sm font-semibold focus:border-[rgb(var(--accent))]"
        />
      </form>

      {produtos.length === 0 ? (
        <Panel title="Nenhum produto">
          <p className="text-sm text-[rgb(var(--muted))]">
            {busca ? `Nada encontrado para "${busca}".` : 'O catálogo está vazio.'}
          </p>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Produtos do catálogo, em ordem alfabética</caption>
              <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60">
                <tr className="text-left text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                  <th scope="col" className="px-5 py-3">
                    Produto
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Categoria
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Situação
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Preço
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Disponível
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Reservado
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {produtos.map((produto) => (
                  <tr
                    key={produto.slug}
                    className="transition hover:bg-[rgb(var(--surface-muted))]/40"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/products/${produto.slug}`}
                        className="block font-semibold hover:underline"
                      >
                        {produto.name}
                      </Link>
                      <span className="block text-[11px] text-[rgb(var(--muted))]">
                        {produto.brand ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[rgb(var(--muted))]">
                      {produto.categoryName ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          STATUS_TOM[produto.status] ?? STATUS_TOM.archived
                        }`}
                      >
                        {STATUS_ROTULO[produto.status] ?? produto.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                      {produto.priceInCents === null ? '—' : formatBRL(produto.priceInCents)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-bold tabular-nums ${
                        produto.available <= 0
                          ? 'text-red-700'
                          : produto.available <= 5
                            ? 'text-amber-700'
                            : ''
                      }`}
                    >
                      {produto.available}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[rgb(var(--muted))]">
                      {produto.reserved}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/products/${produto.slug}`}
                          aria-label={`Editar ${produto.name}`}
                          className="inline-flex size-9 items-center justify-center rounded-full text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Link>
                        <Link
                          href={`/products/${produto.slug}`}
                          target="_blank"
                          aria-label={`Ver ${produto.name} na loja`}
                          className="inline-flex size-9 items-center justify-center rounded-full text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
                        >
                          <ExternalLink aria-hidden="true" className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs leading-5 text-[rgb(var(--muted))]">
        O estoque disponível já desconta o que está reservado por pedidos
        abertos. Ajustes de saldo são feitos na ficha do produto e ficam
        registrados como movimento.
      </p>
    </div>
  );
}
