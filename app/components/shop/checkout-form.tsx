'use client';

import { CircleAlert, Loader2, LockKeyhole, Send } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';

import { submitOrder, type SubmitOrderState } from '../../(public)/checkout/actions';
import { useCartStore } from '../../../src/lib/cart/store';
import { canSubmitOrder } from '../../../src/lib/cart/summary';
import { formatCEP, formatCPF, formatPhone } from '../../../src/lib/orders/cpf';
import { EDUCATION_STAGES } from '../../../src/lib/program/material-escolar';
import { formatBRL } from '../../../src/lib/money';
import { cn } from '../../../src/lib/cn';
import { buttonStyles } from '../ui/button';
import { useCartSummary } from './cart-catalog';
import { Field, inputStyles, TextInput } from './field';
import { OrderConfirmation } from './order-confirmation';

const INITIAL: SubmitOrderState = { status: 'idle' };

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(submitOrder, INITIAL);
  const summary = useCartSummary();
  const stage = useCartStore((s) => s.stage);
  const setStage = useCartStore((s) => s.setStage);
  const clear = useCartStore((s) => s.clear);
  const lines = useCartStore((s) => s.lines);

  const errorRef = useRef<HTMLDivElement>(null);

  // Campos que a pessoa vê formatados enquanto digita. O servidor recebe o
  // texto formatado e tira a máscara — nunca o contrário.
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');

  const succeeded = state.status === 'success';

  // O carrinho só é esvaziado depois que o pedido existe de verdade no
  // servidor. Limpar antes perderia a lista se o envio falhasse.
  useEffect(() => {
    if (succeeded) clear();
  }, [succeeded, clear]);

  // Um erro no topo precisa ser encontrado: leva o foco até ele em vez de
  // deixar a pessoa rolar procurando o que deu errado.
  useEffect(() => {
    if (state.status === 'invalid' || state.status === 'cart-changed') {
      errorRef.current?.focus();
    }
  }, [state]);

  if (state.status === 'success') {
    return <OrderConfirmation order={state.order} />;
  }

  if (summary === null) {
    return <div className="skeleton-shimmer h-96 rounded-3xl" />;
  }

  if (summary.items.length === 0 || !canSubmitOrder(summary)) {
    return <CheckoutBlocked empty={summary.items.length === 0} />;
  }

  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <input type="hidden" name="linhas" value={JSON.stringify(lines)} />
      <input
        type="hidden"
        name="checkoutIdempotencyKey"
        ref={(node) => {
          if (node && !node.value) node.value = crypto.randomUUID();
        }}
      />

      <div className="min-w-0 space-y-8">
        {state.status === 'invalid' || state.status === 'cart-changed' ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-2xl border border-[rgb(var(--accent))]/35 bg-[rgb(var(--accent-soft))] p-4 outline-none"
          >
            <p className="flex items-start gap-2 text-sm font-extrabold text-[rgb(var(--accent))]">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {state.status === 'cart-changed'
                ? state.formError
                : 'Confira os campos destacados abaixo.'}
            </p>
            {state.status === 'cart-changed' && state.issues.length > 0 ? (
              <ul className="mt-2 ml-6 list-disc space-y-1 text-xs leading-5 font-semibold">
                {state.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {state.status === 'cart-changed' ? (
              <Link
                href="/cart"
                className="mt-3 inline-block text-xs font-extrabold underline underline-offset-4"
              >
                Voltar ao carrinho
              </Link>
            ) : null}
          </div>
        ) : null}

        <Fieldset
          title="Responsável"
          description="A nota fiscal da compra do benefício sai no CPF do responsável."
        >
          <Field label="Nome completo" required error={fieldErrors.responsavelNome}>
            {(props) => (
              <TextInput
                {...props}
                name="responsavelNome"
                autoComplete="name"
                invalid={Boolean(fieldErrors.responsavelNome)}
                placeholder="Como está no documento"
              />
            )}
          </Field>

          <Field label="CPF" required error={fieldErrors.responsavelCpf}>
            {(props) => (
              <TextInput
                {...props}
                name="responsavelCpf"
                inputMode="numeric"
                autoComplete="off"
                value={cpf}
                onChange={(event) => setCpf(formatCPF(event.target.value))}
                invalid={Boolean(fieldErrors.responsavelCpf)}
                placeholder="000.000.000-00"
              />
            )}
          </Field>

          <Field
            label="E-mail"
            required
            error={fieldErrors.email}
            hint="Onde você receberá o código do pedido e o link de pagamento."
          >
            {(props) => (
              <TextInput
                {...props}
                name="email"
                type="email"
                autoComplete="email"
                invalid={Boolean(fieldErrors.email)}
                placeholder="voce@exemplo.com"
              />
            )}
          </Field>

          <Field label="Telefone" required error={fieldErrors.telefone}>
            {(props) => (
              <TextInput
                {...props}
                name="telefone"
                inputMode="tel"
                autoComplete="tel"
                value={telefone}
                onChange={(event) => setTelefone(formatPhone(event.target.value))}
                invalid={Boolean(fieldErrors.telefone)}
                placeholder="(11) 90000-0000"
              />
            )}
          </Field>
        </Fieldset>

        <Fieldset
          title="Estudante"
          description="O ano ou a etapa define o crédito e os itens autorizados."
        >
          <Field label="Ano ou etapa" required error={fieldErrors.etapa}>
            {(props) => (
              <select
                {...props}
                name="etapa"
                value={stage ?? ''}
                onChange={(event) => setStage(event.target.value || null)}
                className={cn(
                  inputStyles({ invalid: Boolean(fieldErrors.etapa) }),
                  'cursor-pointer',
                )}
              >
                <option value="">Selecione…</option>
                {EDUCATION_STAGES.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.shortName} — {formatBRL(option.benefitAmountInCents)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Fieldset>

        <Fieldset
          title="Endereço de entrega"
          description="A entrega é gratuita e precisa ser em endereço residencial — não pode ser feita em escola, DRE ou unidade da SME."
        >
          <Field label="CEP" required error={fieldErrors.cep} className="sm:col-span-1">
            {(props) => (
              <TextInput
                {...props}
                name="cep"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={(event) => setCep(formatCEP(event.target.value))}
                invalid={Boolean(fieldErrors.cep)}
                placeholder="00000-000"
              />
            )}
          </Field>

          <div className="hidden sm:block" aria-hidden="true" />

          <Field
            label="Rua ou avenida"
            required
            error={fieldErrors.logradouro}
            className="sm:col-span-2"
          >
            {(props) => (
              <TextInput
                {...props}
                name="logradouro"
                autoComplete="address-line1"
                invalid={Boolean(fieldErrors.logradouro)}
              />
            )}
          </Field>

          <Field label="Número" required error={fieldErrors.numero}>
            {(props) => (
              <TextInput
                {...props}
                name="numero"
                inputMode="numeric"
                invalid={Boolean(fieldErrors.numero)}
              />
            )}
          </Field>

          <Field label="Complemento" error={fieldErrors.complemento}>
            {(props) => (
              <TextInput
                {...props}
                name="complemento"
                autoComplete="address-line2"
                placeholder="Apto, bloco, fundos…"
              />
            )}
          </Field>

          <Field label="Bairro" required error={fieldErrors.bairro}>
            {(props) => (
              <TextInput {...props} name="bairro" invalid={Boolean(fieldErrors.bairro)} />
            )}
          </Field>

          <Field label="Cidade" required error={fieldErrors.cidade}>
            {(props) => (
              <TextInput
                {...props}
                name="cidade"
                autoComplete="address-level2"
                defaultValue="São Paulo"
                invalid={Boolean(fieldErrors.cidade)}
              />
            )}
          </Field>

          <Field label="Estado" required error={fieldErrors.uf}>
            {(props) => (
              <TextInput
                {...props}
                name="uf"
                maxLength={2}
                autoComplete="address-level1"
                defaultValue="SP"
                invalid={Boolean(fieldErrors.uf)}
                className="uppercase"
              />
            )}
          </Field>

          <Field
            label="Observações para a entrega"
            error={fieldErrors.observacoes}
            className="sm:col-span-2"
          >
            {(props) => (
              <textarea
                {...props}
                name="observacoes"
                rows={3}
                maxLength={500}
                placeholder="Ponto de referência, melhor horário…"
                className={cn(inputStyles(), 'min-h-24 resize-y py-2.5')}
              />
            )}
          </Field>
        </Fieldset>
      </div>

      <CheckoutAside summary={summary} pending={pending} error={fieldErrors.aceiteRegras} />
    </form>
  );
}

function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
      <legend className="px-2 text-sm font-extrabold">{title}</legend>
      <p className="text-xs leading-5 text-[rgb(var(--muted))]">{description}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function CheckoutAside({
  summary,
  pending,
  error,
}: {
  summary: NonNullable<ReturnType<typeof useCartSummary>>;
  pending: boolean;
  error?: string;
}) {
  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
        <h2 className="text-sm font-extrabold">
          {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'itens'}
        </h2>

        <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {summary.items.map((item) => (
            <li key={item.product.slug} className="flex justify-between gap-3 text-xs">
              <span className="min-w-0 font-bold">
                <span className="tabular-nums-tight text-[rgb(var(--muted))]">
                  {item.quantity}×
                </span>{' '}
                {item.product.name}
              </span>
              <span className="tabular-nums-tight shrink-0 font-bold">
                {formatBRL(item.lineTotalInCents)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="tabular-nums-tight mt-5 space-y-2 border-t border-[rgb(var(--border))] pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[rgb(var(--muted))]">Subtotal</dt>
            <dd className="font-bold">{formatBRL(summary.subtotalInCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[rgb(var(--muted))]">Entrega</dt>
            <dd className="font-bold text-[rgb(var(--sage-ink))]">Grátis</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[rgb(var(--border))] pt-3">
            <dt className="font-extrabold">Total</dt>
            <dd className="font-display text-xl font-black">
              {formatBRL(summary.subtotalInCents)}
            </dd>
          </div>
        </dl>

        {summary.overBudgetInCents > 0 ? (
          <p className="mt-4 rounded-2xl bg-[rgb(var(--sun-soft))] p-3 text-[11px] leading-5 font-bold">
            O pedido passa {formatBRL(summary.overBudgetInCents)} do crédito da etapa. A loja
            confirma com você como pagar a diferença antes de enviar o link.
          </p>
        ) : null}

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[rgb(var(--surface-muted))] p-3.5">
          <input
            type="checkbox"
            name="aceiteRegras"
            className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--accent))]"
            aria-describedby={error ? 'aceite-erro' : undefined}
          />
          <span className="text-[11px] leading-4 font-semibold">
            Confirmo que os dados estão corretos e que a compra segue as regras do Programa Material
            Escolar.
          </span>
        </label>
        {error ? (
          <p id="aceite-erro" className="mt-1.5 text-[11px] font-bold text-[rgb(var(--accent))]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={buttonStyles({ size: 'lg', className: 'mt-5 w-full' })}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Enviando pedido…
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="size-4" />
              Enviar pedido
            </>
          )}
        </button>

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-4 font-semibold text-[rgb(var(--sage-ink))]">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Nenhum pagamento acontece agora. A loja confere o pedido e envia um link seguro. Sua senha
          e o código do cartão nunca são pedidos aqui.
        </p>
      </section>
    </div>
  );
}

function CheckoutBlocked({ empty }: { empty: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-[rgb(var(--border-strong))] bg-white px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-extrabold">
        {empty ? 'Não há nada para enviar ainda.' : 'Revise o carrinho antes de seguir.'}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[rgb(var(--muted))]">
        {empty
          ? 'Escolha os materiais da lista para montar o pedido.'
          : 'Alguns itens precisam de ajuste — estoque, limite por pedido ou etapa.'}
      </p>
      <Link
        href={empty ? '/products' : '/cart'}
        className={buttonStyles({ size: 'lg', className: 'mt-7' })}
      >
        {empty ? 'Ver os materiais' : 'Voltar ao carrinho'}
      </Link>
    </div>
  );
}
