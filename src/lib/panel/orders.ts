import 'server-only';

import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import { orderItems, orders } from '../../db/schema';
import { ORDER_STATUSES } from '../../db/schema';
import type { OrderStatus } from '../orders/order';

/**
 * Leitura de pedidos para o painel.
 *
 * A listagem é deliberadamente magra: nome, e-mail, total e situação. O CPF
 * fica cifrado e **não** é decifrado aqui — quem precisa dele abre a ficha do
 * pedido, e essa decisão fica registrada em uma tela só, em vez de espalhar
 * dado sensível por uma tabela que a operação deixa aberta o dia todo.
 *
 * A ficha completa vem de `orders/repository.getOrderByCode`, que já monta o
 * pedido inteiro.
 */

export type PanelOrderRow = {
  code: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  /** Já vem mascarado do banco; o CPF em claro nunca sai daqui. */
  cpfMasked: string;
  email: string;
  totalInCents: number;
  itemCount: number;
};

export type PanelOrderFilters = {
  status?: OrderStatus | 'todos';
  search?: string;
};

export type StatusCount = { status: OrderStatus; total: number };

const LIST_LIMIT = 100;

export async function listPanelOrders(filters: PanelOrderFilters = {}): Promise<PanelOrderRow[]> {
  const conditions = [];

  if (filters.status && filters.status !== 'todos') {
    conditions.push(eq(orders.status, filters.status));
  }

  const search = filters.search?.trim();
  if (search) {
    // Busca por código, nome ou e-mail. O CPF não entra: ele está cifrado, e
    // procurar por ele exigiria o índice cego — outra tela, outra intenção.
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(orders.publicCode, pattern),
        ilike(orders.responsibleName, pattern),
        ilike(orders.email, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      code: orders.publicCode,
      status: orders.status,
      createdAt: orders.createdAt,
      customerName: orders.responsibleName,
      cpfMasked: orders.responsibleCpfMasked,
      email: orders.email,
      totalInCents: orders.totalCents,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(
      orders.id,
      orders.publicCode,
      orders.status,
      orders.createdAt,
      orders.responsibleName,
      orders.responsibleCpfMasked,
      orders.email,
      orders.totalCents,
    )
    .orderBy(desc(orders.createdAt))
    .limit(LIST_LIMIT);

  return rows.map((row) => ({
    code: row.code,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customerName,
    cpfMasked: row.cpfMasked,
    email: row.email,
    totalInCents: row.totalInCents,
    itemCount: row.itemCount,
  }));
}

/** Contagem por situação, para as abas da listagem. Estados sem pedido vêm zerados. */
export async function countOrdersByStatus(): Promise<StatusCount[]> {
  const rows = await db
    .select({ status: orders.status, total: count() })
    .from(orders)
    .groupBy(orders.status);

  const found = new Map(rows.map((row) => [row.status, row.total]));
  return ORDER_STATUSES.map((status) => ({
    status: status as OrderStatus,
    total: found.get(status) ?? 0,
  }));
}

export type PanelOrderSummary = {
  totalOrders: number;
  awaitingAction: number;
  paidRevenueInCents: number;
};

/**
 * Números do topo da página. "Aguardando ação" é o que a operação precisa
 * tocar hoje: pedido conferindo, link a enviar ou análise manual.
 */
export async function getPanelOrderSummary(): Promise<PanelOrderSummary> {
  const [totals] = await db
    .select({
      totalOrders: count(),
      awaitingAction: sql<number>`count(*) filter (
        where ${orders.status} in ('draft', 'awaiting_payment_link', 'payment_link_sent', 'manual_review')
      )::int`,
      paidRevenueInCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (
        where ${orders.status} in ('paid', 'preparing', 'out_for_delivery', 'delivered')
      ), 0)::int`,
    })
    .from(orders);

  return {
    totalOrders: totals?.totalOrders ?? 0,
    awaitingAction: totals?.awaitingAction ?? 0,
    paidRevenueInCents: totals?.paidRevenueInCents ?? 0,
  };
}
