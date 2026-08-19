import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Inbox, Search } from 'lucide-react';

import { ORDER_STATUS_LABEL, type OrderStatus } from '../../../src/lib/orders/order';
import {
  countOrdersByStatus,
  getPanelOrderSummary,
  listPanelOrders,
} from '../../../src/lib/panel/orders';
import { formatBRL } from '../../../src/lib/money';
import { PageHeader, Panel, StatCard } from '../_components/ui';
import { OrderStatusPill } from './status-pill';

export const metadata: Metadata = { title: 'Pedidos — Painel Balaio de Gato' };
export const dynamic = 'force-dynamic';

/** Situações que a operação precisa tocar. Vêm primeiro nas abas. */
const ABAS_PRIORITARIAS: OrderStatus[] = [
  'awaiting_payment_link',
  'payment_link_sent',
  'manual_review',
  'paid',
  'preparing',
  'out_for_delivery',
];

const ABAS_FINAIS: OrderStatus[] = ['delivered', 'cancelled'];

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function PanelOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ situacao?: string; busca?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const busca = params.busca?.trim() ?? '';
  const situacao = (params.situacao ?? 'todos') as OrderStatus | 'todos';

  const [pedidos, contagens, resumo] = await Promise.all([
    listPanelOrders({ status: situacao, search: busca }),
    countOrdersByStatus(),
    getPanelOrderSummary(),
  ]);

  const totalPor = new Map(contagens.map((c) => [c.status, c.total]));
  const abas: { valor: OrderStatus | 'todos'; rotulo: string; total: number }[] = [
    { valor: 'todos', rotulo: 'Todos', total: resumo.totalOrders },
    ...[...ABAS_PRIORITARIAS, ...ABAS_FINAIS].map((status) => ({
      valor: status,
      rotulo: ORDER_STATUS_LABEL[status],
      total: totalPor.get(status) ?? 0,
    })),
  ];

  function href(valor: OrderStatus | 'todos'): string {
    const q = new URLSearchParams();
    if (valor !== 'todos') q.set('situacao', valor);
    if (busca) q.set('busca', busca);
    const s = q.toString();
    return s ? `/admin/orders?${s}` : '/admin/orders';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="OPERAÇÃO"
        title="Pedidos"
        titleAccent="do programa"
        subtitle="Confira o pedido, envie o link de pagamento e acompanhe até a entrega."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Pedidos" value={String(resumo.totalOrders)} />
        <StatCard
          title="Aguardando ação"
          value={String(resumo.awaitingAction)}
          sub="Conferência, link ou análise manual"
          accent
        />
        <StatCard
          title="Receita confirmada"
          value={formatBRL(resumo.paidRevenueInCents)}
          sub="Pedidos pagos em diante"
        />
      </div>

      <form method="get" role="search" className="relative max-w-md">
        <label htmlFor="busca-pedido" className="sr-only">
          Buscar pedido por código, nome ou e-mail
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[rgb(var(--muted))]"
        />
        <input
          id="busca-pedido"
          name="busca"
          type="search"
          defaultValue={busca}
          placeholder="BG-XXXXXX, nome ou e-mail"
          className="min-h-11 w-full rounded-full border border-[rgb(var(--border))] bg-white pr-4 pl-11 text-sm font-semibold focus:border-[rgb(var(--accent))] focus:outline-none"
        />
        {situacao !== 'todos' ? (
          <input type="hidden" name="situacao" value={situacao} />
        ) : null}
      </form>

      <nav aria-label="Filtrar por situação">
        <ul className="flex flex-wrap gap-2">
          {abas.map((aba) => {
            const ativa = aba.valor === situacao;
            return (
              <li key={aba.valor}>
                <Link
                  href={href(aba.valor)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${
                    ativa
                      ? 'border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-white'
                      : 'border-[rgb(var(--border))] bg-white hover:border-[rgb(var(--border-strong))]'
                  }`}
                >
                  {aba.rotulo}
                  <span
                    className={`tabular-nums ${ativa ? 'text-white/70' : 'text-[rgb(var(--muted))]'}`}
                  >
                    {aba.total}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {pedidos.length === 0 ? (
        <Panel title="Nenhum pedido aqui">
          <p className="text-sm text-[rgb(var(--muted))]">
            {busca
              ? `Nada encontrado para "${busca}".`
              : 'Os pedidos enviados pela loja aparecem nesta lista.'}
          </p>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">
                Pedidos, do mais recente para o mais antigo
              </caption>
              <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60">
                <tr className="text-left text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                  <th scope="col" className="px-5 py-3">
                    Código
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Responsável
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Situação
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Itens
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {pedidos.map((pedido) => (
                  <tr key={pedido.code} className="transition hover:bg-[rgb(var(--surface-muted))]/40">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${pedido.code}`}
                        className="font-mono font-bold hover:underline"
                      >
                        {pedido.code}
                      </Link>
                      <span className="mt-0.5 block text-[11px] text-[rgb(var(--muted))]">
                        {dataHora.format(new Date(pedido.createdAt))}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block font-semibold">{pedido.customerName}</span>
                      <span className="block text-[11px] text-[rgb(var(--muted))]">
                        {pedido.email} · CPF {pedido.cpfMasked}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusPill status={pedido.status} />
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">{pedido.itemCount}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums">
                      {formatBRL(pedido.totalInCents)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/orders/${pedido.code}`}
                        aria-label={`Abrir pedido ${pedido.code}`}
                        className="inline-flex size-9 items-center justify-center rounded-full text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
                      >
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-[rgb(var(--muted))]">
        <Inbox aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        A lista mostra o CPF mascarado. O documento completo só é decifrado na
        ficha do pedido, quando a operação precisa dele para emitir a nota.
      </p>
    </div>
  );
}
