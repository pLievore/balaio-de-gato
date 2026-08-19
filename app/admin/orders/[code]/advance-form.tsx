'use client';

import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react';
import { useActionState } from 'react';

import { advanceOrder, type AdvanceOrderState } from '../actions';
import {
  ORDER_TRANSITION_ACTION,
  type OrderStatus,
} from '../../../../src/lib/orders/order';

const INICIAL: AdvanceOrderState = { status: 'idle' };

/**
 * Botões de transição do pedido.
 *
 * Só aparecem as transições que o domínio permite a partir da situação atual,
 * então não existe botão que leve a um erro previsível. Cancelar fica separado
 * e em vermelho porque é a única ação daqui que não tem volta.
 */
export function AdvanceOrderForm({
  code,
  options,
}: {
  code: string;
  options: readonly OrderStatus[];
}) {
  const [state, formAction, pending] = useActionState(advanceOrder, INICIAL);

  if (options.length === 0) {
    return (
      <p className="text-sm text-[rgb(var(--muted))]">
        Este pedido chegou ao fim do fluxo. Não há mais ações disponíveis.
      </p>
    );
  }

  const avancos = options.filter((option) => option !== 'cancelled');
  const podeCancelar = options.includes('cancelled');

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="code" value={code} />

        {avancos.map((option) => (
          <button
            key={option}
            type="submit"
            name="status"
            value={option}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {ORDER_TRANSITION_ACTION[option]}
          </button>
        ))}

        {podeCancelar ? (
          <button
            type="submit"
            name="status"
            value="cancelled"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full border border-red-200 bg-white px-5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {ORDER_TRANSITION_ACTION.cancelled}
          </button>
        ) : null}
      </form>

      {state.status !== 'idle' ? (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-2xl p-3 text-xs leading-5 font-semibold ${
            state.status === 'success'
              ? 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {state.status === 'success' ? (
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          {state.message}
        </p>
      ) : null}

      {podeCancelar ? (
        <p className="text-[11px] leading-4 text-[rgb(var(--muted))]">
          Cancelar devolve os itens ao estoque. Depois de confirmar o pagamento o
          cancelamento deixa de ser possível, porque exigiria estorno.
        </p>
      ) : null}
    </div>
  );
}
