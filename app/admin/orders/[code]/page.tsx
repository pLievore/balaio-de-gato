import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ShieldAlert } from 'lucide-react';

import {
  allowedTransitions,
  isOrderCode,
  ORDER_STATUS_DESCRIPTION,
} from '../../../../src/lib/orders/order';
import { getOrderByCode } from '../../../../src/lib/orders/repository';
import { formatCEP, formatCPF, formatPhone } from '../../../../src/lib/orders/cpf';
import { formatBRL } from '../../../../src/lib/money';
import { getEducationStage } from '../../../../src/lib/program/material-escolar';
import { PageHeader, Panel } from '../../_components/ui';
import { OrderStatusPill } from '../status-pill';
import { AdvanceOrderForm } from './advance-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Pedido ${code.toUpperCase()} — Painel Balaio de Gato` };
}

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'long',
  timeStyle: 'short',
});

export default async function PanelOrderDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = decodeURIComponent(code).toUpperCase();
  if (!isOrderCode(normalized)) notFound();

  const order = await getOrderByCode(normalized);
  if (!order) notFound();

  const stage = getEducationStage(order.customer.etapa);
  const transitions = allowedTransitions(order.status);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Voltar aos pedidos
      </Link>

      <PageHeader
        eyebrow="PEDIDO"
        title={normalized}
        titleAccent={stage?.shortName ?? ''}
        subtitle={`Feito em ${dataHora.format(new Date(order.createdAt))}.`}
        actions={<OrderStatusPill status={order.status} />}
      />

      <Panel title="Situação e próximos passos">
        <p className="mb-4 text-sm leading-6 text-[rgb(var(--muted))]">
          {ORDER_STATUS_DESCRIPTION[order.status]}
        </p>
        <AdvanceOrderForm code={normalized} options={transitions} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Responsável">
          <dl className="space-y-2.5 text-sm">
            <Linha rotulo="Nome" valor={order.customer.responsavelNome} />
            <Linha rotulo="CPF" valor={formatCPF(order.customer.responsavelCpf)} destaque />
            <Linha rotulo="E-mail" valor={order.customer.email} />
            <Linha rotulo="Telefone" valor={formatPhone(order.customer.telefone)} />
            <Linha rotulo="Etapa" valor={stage?.name ?? order.customer.etapa} />
          </dl>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[11px] leading-4 font-semibold text-amber-900">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            O CPF acima foi decifrado para esta tela porque a nota fiscal do
            benefício sai no documento do responsável. Não copie para fora do
            painel.
          </p>
        </Panel>

        <Panel title="Entrega">
          <address className="text-sm leading-6 not-italic">
            {order.address.logradouro}, {order.address.numero}
            {order.address.complemento ? ` — ${order.address.complemento}` : ''}
            <br />
            {order.address.bairro}
            <br />
            {order.address.cidade} — {order.address.uf}
            <br />
            CEP {formatCEP(order.address.cep)}
          </address>
          {order.observacoes ? (
            <p className="mt-4 rounded-2xl bg-[rgb(var(--surface-muted))] p-3 text-xs leading-5">
              <strong className="block font-bold">Observações do responsável</strong>
              {order.observacoes}
            </p>
          ) : null}
          <p className="mt-4 text-[11px] text-[rgb(var(--muted))]">
            Entrega gratuita: a regra do programa proíbe cobrar o frete da
            família.
          </p>
        </Panel>
      </div>

      <Panel title={`Itens (${order.items.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-[rgb(var(--border))]">
              <tr className="text-left text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                <th scope="col" className="py-2">
                  Material
                </th>
                <th scope="col" className="py-2 text-right">
                  Qtd.
                </th>
                <th scope="col" className="py-2 text-right">
                  Unitário
                </th>
                <th scope="col" className="py-2 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {order.items.map((item) => (
                <tr key={item.slug}>
                  <td className="py-3">
                    <Link
                      href={`/products/${item.slug}`}
                      target="_blank"
                      className="font-semibold hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="block text-[11px] text-[rgb(var(--muted))]">
                      {item.brand} · {item.sku}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-right tabular-nums">
                    {formatBRL(item.unitPriceInCents)}
                  </td>
                  <td className="py-3 text-right font-bold tabular-nums">
                    {formatBRL(item.lineTotalInCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 space-y-2 border-t border-[rgb(var(--border))] pt-4 text-sm">
          <Linha rotulo="Subtotal" valor={formatBRL(order.subtotalInCents)} />
          <Linha rotulo="Entrega" valor="Grátis" />
          <Linha rotulo="Total" valor={formatBRL(order.totalInCents)} destaque />
          <Linha
            rotulo={`Crédito de ${stage?.shortName ?? 'etapa'}`}
            valor={formatBRL(order.benefitInCents)}
          />
          {order.overBudgetInCents > 0 ? (
            <div className="flex items-baseline justify-between gap-4 text-red-700">
              <dt className="font-bold">Acima do crédito</dt>
              <dd className="font-bold tabular-nums">{formatBRL(order.overBudgetInCents)}</dd>
            </div>
          ) : null}
        </dl>

        {order.overBudgetInCents > 0 ? (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 font-semibold text-amber-900">
            Combine com o responsável como a diferença será paga antes de enviar
            o link.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[rgb(var(--muted))]">{rotulo}</dt>
      <dd className={destaque ? 'font-bold tabular-nums' : 'font-semibold tabular-nums'}>
        {valor}
      </dd>
    </div>
  );
}
