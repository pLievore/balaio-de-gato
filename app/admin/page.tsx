import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, PackageX, Store } from 'lucide-react';

import type { OrderStatus } from '../../src/lib/orders/order';
import {
  getCatalogHealth,
  getDailyOrders,
  getLowStock,
  getOverviewTotals,
  getRecentOrders,
  getTopProducts,
} from '../../src/lib/panel/overview';
import { formatBRL } from '../../src/lib/money';
import { BiHero, KpiCard, PageHeader, Panel } from './_components/ui';
import { OrderStatusPill } from './orders/status-pill';

export const metadata: Metadata = { title: 'Visão geral — Painel Balaio de Gato' };
export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: 'short',
});

export default async function PanelOverviewPage() {
  const [totais, serie, topProdutos, estoqueBaixo, recentes, catalogo] = await Promise.all([
    getOverviewTotals(),
    getDailyOrders(14),
    getTopProducts(6),
    getLowStock(8),
    getRecentOrders(6),
    getCatalogHealth(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PAINEL"
        title="Visão"
        titleAccent="geral"
        subtitle="O que a operação precisa olhar hoje."
        actions={
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
          >
            <Store aria-hidden="true" className="size-4" />
            Ver a loja
          </Link>
        }
      />

      <BiHero
        eyebrow="Aguardando ação"
        value={String(totais.awaitingAction)}
        side={
          <Link
            href="/admin/orders"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[rgb(var(--fg))] transition hover:opacity-90"
          >
            Abrir pedidos
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      >
        <p className="text-sm leading-6 text-white/70">
          Pedidos em conferência, com link a enviar ou em análise manual. É a
          fila que trava o pagamento do responsável se ninguém tocar.
        </p>
      </BiHero>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Pedidos (30 dias)"
          value={String(totais.ordersLast30Days)}
          sub={`${totais.ordersTotal} desde o início`}
          spark={serie.map((ponto) => ponto.total)}
          href="/admin/orders"
        />
        <KpiCard
          title="Receita confirmada"
          value={formatBRL(totais.paidRevenueInCents)}
          sub="Pedidos pagos em diante"
        />
        <KpiCard
          title="Ticket médio"
          value={formatBRL(totais.averageTicketInCents)}
          sub="Somente pedidos pagos"
        />
        <KpiCard
          title="Catálogo ativo"
          value={String(catalogo.activeProducts)}
          sub={`${catalogo.outOfStock} sem disponibilidade`}
          href="/admin/products"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Últimos pedidos">
          {recentes.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">
              Nenhum pedido ainda. Os pedidos enviados pela loja aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--border))]">
              {recentes.map((pedido) => (
                <li key={pedido.code} className="flex flex-wrap items-center gap-3 py-3">
                  <Link
                    href={`/admin/orders/${pedido.code}`}
                    className="font-mono text-sm font-bold hover:underline"
                  >
                    {pedido.code}
                  </Link>
                  <OrderStatusPill status={pedido.status as OrderStatus} />
                  <span className="min-w-0 flex-1 truncate text-xs text-[rgb(var(--muted))]">
                    {pedido.customerName} · {dataCurta.format(new Date(pedido.createdAt))}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatBRL(pedido.totalInCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Estoque no limite">
          {estoqueBaixo.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">
              Nenhum item abaixo do ponto de reposição.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--border))]">
              {estoqueBaixo.map((item) => (
                <li key={item.slug} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                      item.available <= 0
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.available <= 0 ? (
                      <PackageX className="size-4" />
                    ) : (
                      <AlertTriangle className="size-4" />
                    )}
                  </span>
                  <Link
                    href={`/products/${item.slug}`}
                    target="_blank"
                    className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="text-xs font-bold tabular-nums">
                    {item.available <= 0 ? 'esgotado' : `${item.available} un.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-4 text-[rgb(var(--muted))]">
            Disponível é o que sobra depois das reservas dos pedidos abertos.
          </p>
        </Panel>
      </div>

      <Panel title="Materiais mais pedidos">
        {topProdutos.length === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">
            Ainda não há pedidos suficientes para montar este ranking.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {topProdutos.map((produto) => {
              const maximo = topProdutos[0]?.quantity || 1;
              const proporcao = Math.max(4, Math.round((produto.quantity / maximo) * 100));
              return (
                <li key={produto.slug}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <Link
                      href={`/products/${produto.slug}`}
                      target="_blank"
                      className="min-w-0 truncate font-semibold hover:underline"
                    >
                      {produto.name}
                    </Link>
                    <span className="shrink-0 text-xs text-[rgb(var(--muted))] tabular-nums">
                      {produto.quantity} un. · {formatBRL(produto.revenueInCents)}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"
                  >
                    <div
                      className="h-full rounded-full bg-[rgb(var(--accent))]"
                      style={{ width: `${proporcao}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
