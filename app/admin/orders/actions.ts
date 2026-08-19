'use server';

import { revalidatePath } from 'next/cache';

import { hasValidPanelSession } from '../../../src/lib/panel/session';
import {
  canTransition,
  isOrderCode,
  ORDER_TRANSITIONS,
  type OrderStatus,
} from '../../../src/lib/orders/order';
import { getOrderByCode, updateOrderStatus } from '../../../src/lib/orders/repository';

export type AdvanceOrderState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && Object.hasOwn(ORDER_TRANSITIONS, value);
}

/**
 * Move o pedido para a próxima situação.
 *
 * A validação acontece duas vezes de propósito: aqui, para recusar um valor
 * forjado antes de abrir transação, e dentro do repositório, que é quem
 * garante a regra junto com o estoque. A interface não é a fonte da regra.
 */
export async function advanceOrder(
  _previous: AdvanceOrderState,
  formData: FormData,
): Promise<AdvanceOrderState> {
  if (!(await hasValidPanelSession())) {
    return { status: 'error', message: 'Sessão expirada. Entre novamente no painel.' };
  }

  const code = String(formData.get('code') ?? '');
  const nextStatus = formData.get('status');

  if (!isOrderCode(code)) {
    return { status: 'error', message: 'Código de pedido inválido.' };
  }
  if (!isOrderStatus(nextStatus)) {
    return { status: 'error', message: 'Situação desconhecida.' };
  }

  const current = await getOrderByCode(code);
  if (!current) {
    return { status: 'error', message: `Pedido ${code} não encontrado.` };
  }
  if (!canTransition(current.status, nextStatus)) {
    return {
      status: 'error',
      message: `Não é possível ir de "${current.status}" para "${nextStatus}".`,
    };
  }

  try {
    const updated = await updateOrderStatus(code, nextStatus, { actor: 'painel' });
    if (!updated) return { status: 'error', message: `Pedido ${code} não encontrado.` };

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${code}`);
    revalidatePath(`/pedido/${code}`);

    return { status: 'success', message: `Pedido ${code} atualizado.` };
  } catch (error) {
    // A mensagem do repositório explica o motivo (estoque inconsistente,
    // transição proibida). Repassar é mais útil que um "erro inesperado".
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.',
    };
  }
}
