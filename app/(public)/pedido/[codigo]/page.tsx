import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageSearch } from 'lucide-react';

import { CopyOrderCode } from '../../../components/shop/copy-order-code';
import { Container } from '../../../components/ui/container';
import { buttonStyles } from '../../../components/ui/button';
import { formatBRL } from '../../../../src/lib/money';
import { maskCPF, formatCEP } from '../../../../src/lib/orders/cpf';
import {
  isOrderCode,
  ORDER_STATUS_DESCRIPTION,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from '../../../../src/lib/orders/order';
import { getOrderByCode } from '../../../../src/lib/orders/repository';

export const metadata: Metadata = {
  title: 'Acompanhar pedido',
  description: 'Situação do seu pedido na Balaio de Gato.',
  robots: { index: false, follow: false },
};

/** A ordem em que o pedido caminha; cancelamento e revisão saem desta linha. */
const TIMELINE: OrderStatus[] = [
  'awaiting_payment_link',
  'payment_link_sent',
  'paid',
  'preparing',
  'out_for_delivery',
  'delivered',
];

export default async function OrderPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = decodeURIComponent(codigo).toUpperCase();

  const order = isOrderCode(code) ? await getOrderByCode(code) : null;

  if (!order) return <OrderNotFound code={code} />;

  const currentIndex = TIMELINE.indexOf(order.status);

  return (
    <main>
      <Container className="py-10 md:py-14">
        <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
          Acompanhamento
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold md:text-5xl">
          Pedido {order.code}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted))]">
          Feito em{' '}
          {new Date(order.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}{' '}
          por {order.customer.responsavelNome} — CPF {maskCPF(order.customer.responsavelCpf)}.
        </p>

        <section className="mt-9 rounded-3xl border border-[rgb(var(--border))] bg-white p-6 md:p-8">
          <h2 className="text-sm font-extrabold">Situação</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
            {ORDER_STATUS_DESCRIPTION[order.status]}
          </p>

          {order.status === 'cancelled' || order.status === 'manual_review' ? (
            <p className="mt-5 rounded-2xl bg-[rgb(var(--accent-soft))] p-4 text-sm font-bold text-[rgb(var(--accent))]">
              {ORDER_STATUS_LABEL[order.status]}
            </p>
          ) : (
            <ol className="mt-6 space-y-1">
              {TIMELINE.map((status, index) => {
                const done = index < currentIndex;
                const current = index === currentIndex;
                return (
                  <li key={status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden="true"
                        className={`mt-1 size-3 shrink-0 rounded-full ring-4 ${
                          done
                            ? 'bg-[rgb(var(--sage-ink))] ring-[rgb(var(--sage-soft))]'
                            : current
                              ? 'bg-[rgb(var(--accent))] ring-[rgb(var(--accent-soft))]'
                              : 'bg-[rgb(var(--border))] ring-transparent'
                        }`}
                      />
                      {index < TIMELINE.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className={`w-0.5 flex-1 ${
                            done ? 'bg-[rgb(var(--sage-ink))]/35' : 'bg-[rgb(var(--border))]'
                          }`}
                        />
                      ) : null}
                    </div>
                    <div className={`pb-6 ${index === TIMELINE.length - 1 ? 'pb-0' : ''}`}>
                      <p
                        className={`text-sm font-extrabold ${
                          current
                            ? 'text-[rgb(var(--accent))]'
                            : done
                              ? ''
                              : 'text-[rgb(var(--muted))]'
                        }`}
                      >
                        {ORDER_STATUS_LABEL[status]}
                        {current ? <span className="sr-only"> — situação atual</span> : null}
                      </p>
                      {current ? (
                        <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">
                          {ORDER_STATUS_DESCRIPTION[status]}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-[rgb(var(--border))] bg-white p-6 md:p-8">
          <h2 className="text-sm font-extrabold">Itens</h2>
          <ul className="mt-4 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
            {order.items.map((item) => (
              <li key={item.slug} className="flex justify-between gap-4 py-3 text-sm">
                <span className="min-w-0">
                  <Link href={`/products/${item.slug}`} className="font-bold hover:underline">
                    {item.name}
                  </Link>
                  <span className="tabular-nums-tight block text-xs text-[rgb(var(--muted))]">
                    {item.quantity} × {formatBRL(item.unitPriceInCents)}
                  </span>
                </span>
                <span className="tabular-nums-tight shrink-0 font-bold">
                  {formatBRL(item.lineTotalInCents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="tabular-nums-tight mt-4 flex justify-between gap-4">
            <span className="font-extrabold">Total</span>
            <span className="font-display text-xl font-black">{formatBRL(order.totalInCents)}</span>
          </div>

          <div className="mt-6 border-t border-[rgb(var(--border))] pt-5">
            <h3 className="text-xs font-extrabold">Entrega</h3>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
              {order.address.logradouro}, {order.address.numero}
              {order.address.complemento ? ` — ${order.address.complemento}` : ''} ·{' '}
              {order.address.bairro} · {order.address.cidade} — {order.address.uf} · CEP{' '}
              {formatCEP(order.address.cep)}
            </p>
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-[rgb(var(--muted))]">
          A loja nunca pede a senha nem o código do cartão virtual do Kit Escolar. Se alguém pedir
          em nome da Balaio de Gato, não informe.
        </p>
      </Container>
    </main>
  );
}

function OrderNotFound({ code }: { code: string }) {
  return (
    <main>
      <Container size="narrow" className="py-16 md:py-24">
        <div className="rounded-3xl border border-dashed border-[rgb(var(--border-strong))] bg-white px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]"
          >
            <PackageSearch className="size-7" />
          </span>
          <h1 className="font-display mt-5 text-2xl font-extrabold">
            Não encontramos este pedido.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[rgb(var(--muted))]">
            Confira se o código foi digitado corretamente. Ele tem o formato
            <code className="mx-1 font-bold">BG-XXXXXX</code> e chegou no seu e-mail junto com a
            confirmação.
          </p>

          {code ? (
            <div className="mt-6 flex justify-center">
              <CopyOrderCode code={code} />
            </div>
          ) : null}

          <Link href="/products" className={buttonStyles({ size: 'lg', className: 'mt-8' })}>
            Ver os materiais
          </Link>
        </div>
      </Container>
    </main>
  );
}
