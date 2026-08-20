'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { CATALOG_CACHE_TAG } from '../../../src/lib/catalog/repository';
import { hasValidPanelSession } from '../../../src/lib/panel/session';
import {
  canTransition,
  isOrderCode,
  ORDER_TRANSITIONS,
  type OrderStatus,
} from '../../../src/lib/orders/order';
import {
  getOrderByCode,
  issueOrderAccessToken,
  updateOrderStatus,
} from '../../../src/lib/orders/repository';
import { orderTrackingPath } from '../../../src/lib/orders/access-token';
import { isEmailConfigured, sendEmail } from '../../../src/lib/email/client';
import { orderStatusEmail } from '../../../src/lib/email/templates';
import { env } from '../../../src/config/env';
import type { Order } from '../../../src/lib/orders/order';

/**
 * Mudanças que a família precisa saber por e-mail.
 *
 * `preparing` e `manual_review` ficam de fora: são etapas internas, e avisar
 * a cada movimento do painel treina o cliente a ignorar os avisos que
 * importam — justamente o que o golpe explora.
 */
const AVISA_POR_EMAIL = new Set<OrderStatus>([
  'payment_link_sent',
  'paid',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

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

    // Confirmar o pagamento baixa `on_hand` de verdade, e o estoque viaja no
    // catálogo enxuto que o carrinho consulta. Sem invalidar a etiqueta, a
    // loja seguiria oferecendo unidades que já saíram.
    updateTag(CATALOG_CACHE_TAG);
    revalidatePath('/products');
    revalidatePath('/');
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${code}`);
    revalidatePath(`/pedido/${code}`);

    const aviso = await notifyCustomer(updated, nextStatus);

    return { status: 'success', message: `Pedido ${code} atualizado.${aviso}` };
  } catch (error) {
    // A mensagem do repositório explica o motivo (estoque inconsistente,
    // transição proibida). Repassar é mais útil que um "erro inesperado".
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.',
    };
  }
}

/**
 * Avisa a família e diz, na própria resposta do painel, se o aviso saiu.
 *
 * A mudança de situação já está gravada quando chegamos aqui: um erro de
 * e-mail não pode desfazê-la. Mas quem opera precisa saber que o aviso não
 * saiu, para telefonar — daí o texto voltar junto com a confirmação em vez
 * de virar só uma linha de log que ninguém lê.
 */
async function notifyCustomer(order: Order, status: OrderStatus): Promise<string> {
  if (!AVISA_POR_EMAIL.has(status)) return '';
  if (!isEmailConfigured()) return ' E-mail não configurado: avise o cliente por telefone.';

  // Chave nova a cada aviso: o link do e-mail anterior continua valendo, e
  // este chega já pronto para abrir o pedido inteiro.
  const token = await issueOrderAccessToken(order.code);
  const trackingUrl = `${env.siteUrl}${orderTrackingPath(order.code, token)}`;

  const outcome = await sendEmail({
    to: order.customer.email,
    ...orderStatusEmail(order, trackingUrl),
  });

  if (outcome.status === 'sent') return ' Cliente avisado por e-mail.';
  return ` O aviso por e-mail falhou (${outcome.reason}); avise por telefone.`;
}
