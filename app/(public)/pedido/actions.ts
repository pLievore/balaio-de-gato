'use server';

/**
 * Consulta de pedido pelo código.
 *
 * A ação só valida o formato e redireciona: quem decide o que mostrar é
 * `/pedido/[codigo]`, que já separa a visão resumida (só a situação) da visão
 * completa (com a chave de acompanhamento) e já tem limite de requisições.
 * Duplicar essa decisão aqui criaria dois lugares para errar.
 */

import { redirect } from 'next/navigation';

import { isOrderCode } from '../../../src/lib/orders/order';
import { normalizeAccessToken, orderTrackingPath } from '../../../src/lib/orders/access-token';

export type LookupState = { status: 'idle' } | { status: 'invalid'; message: string };

export async function lookupOrder(
  _previous: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const code = String(formData.get('codigo') ?? '')
    .trim()
    .toUpperCase();

  if (!code) {
    return { status: 'invalid', message: 'Informe o código do pedido.' };
  }

  if (!isOrderCode(code)) {
    return {
      status: 'invalid',
      message: 'O código tem o formato BG-XXXXXX, como no e-mail de confirmação.',
    };
  }

  // A chave é opcional: sem ela a página mostra apenas a situação do pedido.
  const rawToken = String(formData.get('chave') ?? '').trim();
  const token = rawToken ? normalizeAccessToken(rawToken) : null;

  redirect(orderTrackingPath(code, token));
}
