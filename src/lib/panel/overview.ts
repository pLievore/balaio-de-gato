import 'server-only';

import { asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  inventoryItems,
  orderItems,
  orders,
  products,
  productVariants,
} from '../../db/schema';

/**
 * Números da visão geral do painel, direto do PostgreSQL.
 *
 * Tudo aqui responde a uma pergunta da operação, não a uma métrica bonita:
 * o que precisa de ação hoje, quanto já foi confirmado, e o que está prestes
 * a faltar na prateleira.
 */

export type OverviewTotals = {
  ordersTotal: number;
  ordersLast30Days: number;
  awaitingAction: number;
  paidRevenueInCents: number;
  averageTicketInCents: number;
};

export async function getOverviewTotals(): Promise<OverviewTotals> {
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [row] = await db
    .select({
      ordersTotal: count(),
      ordersLast30Days: sql<number>`count(*) filter (where ${orders.createdAt} >= ${since})::int`,
      awaitingAction: sql<number>`count(*) filter (
        where ${orders.status} in ('draft', 'awaiting_payment_link', 'payment_link_sent', 'manual_review')
      )::int`,
      paidRevenueInCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (
        where ${orders.status} in ('paid', 'preparing', 'out_for_delivery', 'delivered')
      ), 0)::int`,
      paidCount: sql<number>`count(*) filter (
        where ${orders.status} in ('paid', 'preparing', 'out_for_delivery', 'delivered')
      )::int`,
    })
    .from(orders);

  const paidCount = row?.paidCount ?? 0;
  const paidRevenueInCents = row?.paidRevenueInCents ?? 0;

  return {
    ordersTotal: row?.ordersTotal ?? 0,
    ordersLast30Days: row?.ordersLast30Days ?? 0,
    awaitingAction: row?.awaitingAction ?? 0,
    paidRevenueInCents,
    // Sem pedido pago o ticket médio é zero, não uma divisão por zero.
    averageTicketInCents: paidCount === 0 ? 0 : Math.round(paidRevenueInCents / paidCount),
  };
}

export type DailyOrders = { day: string; total: number };

/** Pedidos por dia nos últimos 14 dias, incluindo os dias sem pedido. */
export async function getDailyOrders(days = 14): Promise<DailyOrders[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.createdAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`,
      total: count(),
    })
    .from(orders)
    .where(gte(orders.createdAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const found = new Map(rows.map((row) => [row.day, row.total]));
  const series: DailyOrders[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since.getTime() + i * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    series.push({ day: key, total: found.get(key) ?? 0 });
  }
  return series;
}

export type TopProduct = {
  slug: string;
  name: string;
  quantity: number;
  revenueInCents: number;
};

/** Mais pedidos, contando apenas pedidos que não foram cancelados. */
export async function getTopProducts(limit = 6): Promise<TopProduct[]> {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenueInCents: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPriceCents})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(sql`${orders.status} <> 'cancelled'`)
    .groupBy(products.slug, products.name)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows;
}

export type LowStockItem = {
  slug: string;
  name: string;
  available: number;
  threshold: number;
};

/**
 * O que está no limite. Disponível é o que sobra depois das reservas — é o
 * número que decide se um novo pedido pode ser aceito.
 */
export async function getLowStock(limit = 8): Promise<LowStockItem[]> {
  const available = sql<number>`(${inventoryItems.onHand} - ${inventoryItems.reserved})`;

  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      available: sql<number>`${available}::int`,
      threshold: inventoryItems.lowStockThreshold,
    })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(sql`${available} <= ${inventoryItems.lowStockThreshold}`)
    .orderBy(asc(sql`${available}`))
    .limit(limit);

  return rows;
}

export type RecentOrder = {
  code: string;
  status: string;
  customerName: string;
  totalInCents: number;
  createdAt: string;
};

export async function getRecentOrders(limit = 6): Promise<RecentOrder[]> {
  const rows = await db
    .select({
      code: orders.publicCode,
      status: orders.status,
      customerName: orders.responsibleName,
      totalInCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export type CatalogHealth = {
  activeProducts: number;
  outOfStock: number;
};

export async function getCatalogHealth(): Promise<CatalogHealth> {
  const [row] = await db
    .select({
      activeProducts: count(),
      outOfStock: sql<number>`count(*) filter (
        where (${inventoryItems.onHand} - ${inventoryItems.reserved}) <= 0
      )::int`,
    })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(products.status, ['active']));

  return {
    activeProducts: row?.activeProducts ?? 0,
    outOfStock: row?.outOfStock ?? 0,
  };
}

/**
 * Pedidos criados nos últimos `days` dias, descontando os cancelados.
 *
 * É o fecho do funil: as etapas anteriores vêm dos sinais do storefront, e
 * esta vem do sistema de registro — o pedido só conta quando existe no banco.
 */
export async function countOrdersInPeriod(days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [row] = await db
    .select({ total: count() })
    .from(orders)
    .where(sql`${orders.createdAt} >= ${since} and ${orders.status} <> 'cancelled'`);
  return row?.total ?? 0;
}
