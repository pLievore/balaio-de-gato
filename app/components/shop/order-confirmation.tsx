import { Check, Copy, Mail, PackageCheck, Truck } from 'lucide-react';
import Link from 'next/link';

import { maskCPF, formatCEP, formatPhone } from '../../../src/lib/orders/cpf';
import {
  ORDER_STATUS_DESCRIPTION,
  ORDER_STATUS_LABEL,
  type Order,
} from '../../../src/lib/orders/order';
import { orderTrackingPath } from '../../../src/lib/orders/access-token';
import { formatBRL } from '../../../src/lib/money';
import { getEducationStage } from '../../../src/lib/program/material-escolar';
import { buttonStyles } from '../ui/button';
import { CopyOrderCode } from './copy-order-code';

/**
 * Confirmação do pedido.
 *
 * O código vem primeiro e grande porque é a única coisa que o responsável
 * precisa guardar — é por ele que a loja encontra o pedido no atendimento. Os
 * próximos passos vêm logo abaixo, em ordem, para que ninguém fique esperando
 * um pagamento que ainda não foi liberado.
 */
export function OrderConfirmation({
  order,
  accessToken,
  emailSent,
}: {
  order: Order;
  /** Chave de acompanhamento; aparece só aqui e no e-mail. */
  accessToken?: string | null;
  /** Se a confirmação por e-mail saiu de fato. */
  emailSent?: boolean;
}) {
  const stage = getEducationStage(order.customer.etapa);
  const trackingHref = orderTrackingPath(order.code, accessToken);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-[rgb(var(--sage))]/30 bg-[rgb(var(--sage-soft))] p-7 text-center md:p-10">
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[rgb(var(--sage-ink))] text-white"
        >
          <Check className="size-7" strokeWidth={3} />
        </span>
        <h1 className="font-display mt-5 text-3xl leading-tight font-extrabold md:text-4xl">
          Pedido enviado para a loja.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgb(var(--sage-ink))]">
          Guarde o código abaixo. É por ele que encontramos o seu pedido no atendimento.
        </p>

        <div className="mt-6">
          <CopyOrderCode code={order.code} />
        </div>

        {/* Antes esta frase era fixa e afirmava um envio que não acontecia. */}
        <p className="mt-4 text-xs leading-5 font-semibold text-[rgb(var(--sage-ink))]">
          {emailSent ? (
            <>
              Também enviamos o código e o link de acompanhamento para{' '}
              <strong>{order.customer.email}</strong>.
            </>
          ) : (
            <>
              Anote o código antes de sair desta página — não conseguimos enviar a confirmação
              para <strong>{order.customer.email}</strong>.
            </>
          )}
        </p>
      </div>

      <section className="mt-8 rounded-3xl border border-[rgb(var(--border))] bg-white p-6 md:p-8">
        <h2 className="text-sm font-extrabold">O que acontece agora</h2>
        <ol className="mt-5 space-y-5">
          {[
            {
              icon: PackageCheck,
              title: 'A loja confere o pedido',
              body: 'Verificamos a disponibilidade dos itens e a elegibilidade no programa.',
              current: true,
            },
            {
              icon: Mail,
              title: 'Você recebe o link de pagamento',
              body: 'Um link seguro chega por e-mail para usar o crédito do Kit Escolar. A loja nunca pede sua senha nem o código do cartão.',
              current: false,
            },
            {
              icon: Truck,
              title: 'Separamos e entregamos',
              body: 'Depois do pagamento confirmado, o pedido é separado e entregue sem custo de frete.',
              current: false,
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                  step.current
                    ? 'bg-[rgb(var(--sage-ink))] text-white'
                    : 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]'
                }`}
              >
                <step.icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm font-extrabold">
                  {index + 1}. {step.title}
                  {step.current ? (
                    <span className="ml-2 rounded-full bg-[rgb(var(--sage-soft))] px-2 py-0.5 text-[10px] font-black tracking-wide text-[rgb(var(--sage-ink))] uppercase">
                      Agora
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-[rgb(var(--border))] bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-extrabold">Resumo do pedido</h2>
          <span className="rounded-full bg-[rgb(var(--surface-muted))] px-3 py-1 text-[11px] font-bold">
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
          {ORDER_STATUS_DESCRIPTION[order.status]}
        </p>

        <ul className="mt-5 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
          {order.items.map((item) => (
            <li key={item.slug} className="flex justify-between gap-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="font-bold">{item.name}</span>
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

        <dl className="tabular-nums-tight mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[rgb(var(--muted))]">Entrega</dt>
            <dd className="font-bold text-[rgb(var(--sage-ink))]">Grátis</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[rgb(var(--border))] pt-3">
            <dt className="font-extrabold">Total</dt>
            <dd className="font-display text-xl font-black">{formatBRL(order.totalInCents)}</dd>
          </div>
          {stage ? (
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-[rgb(var(--muted))]">Crédito de {stage.shortName}</dt>
              <dd className="font-bold">{formatBRL(order.benefitInCents)}</dd>
            </div>
          ) : null}
          {order.overBudgetInCents > 0 ? (
            <div className="flex justify-between gap-4 text-xs">
              <dt className="font-bold text-[rgb(var(--accent))]">Acima do crédito</dt>
              <dd className="font-bold text-[rgb(var(--accent))]">
                {formatBRL(order.overBudgetInCents)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 grid gap-6 border-t border-[rgb(var(--border))] pt-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-extrabold">Responsável</h3>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
              {order.customer.responsavelNome}
              <br />
              CPF {maskCPF(order.customer.responsavelCpf)}
              <br />
              {formatPhone(order.customer.telefone)}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold">Entrega</h3>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
              {order.address.logradouro}, {order.address.numero}
              {order.address.complemento ? ` — ${order.address.complemento}` : ''}
              <br />
              {order.address.bairro}
              <br />
              {order.address.cidade} — {order.address.uf}
              <br />
              CEP {formatCEP(order.address.cep)}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className={buttonStyles({ size: 'lg' })}>
          Continuar comprando
        </Link>
        <Link
          href={trackingHref}
          className={buttonStyles({ variant: 'secondary', size: 'lg' })}
        >
          <Copy aria-hidden="true" className="size-4" />
          Ver acompanhamento
        </Link>
      </div>

      {accessToken ? (
        <p className="mt-5 text-center text-xs leading-5 text-[rgb(var(--muted))]">
          O link de acompanhamento é pessoal: ele abre os seus dados de entrega. Guarde-o como
          guardaria uma senha e não o repasse.
        </p>
      ) : null}
    </div>
  );
}
