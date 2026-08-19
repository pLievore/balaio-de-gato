import { randomUUID } from 'node:crypto';

import { and, count, eq, sql } from 'drizzle-orm';

import { db, pool } from '../src/db/client';
import {
  auditEvents,
  inventoryItems,
  inventoryMovements,
  inventoryReservations,
  orderEvents,
  orderItems,
  orders,
  paymentAttempts,
  productVariants,
  products,
  programCatalogs,
} from '../src/db/schema';
import { getCartProducts } from '../src/lib/catalog/repository';
import { generateOrderCode, type Order } from '../src/lib/orders/order';
import { getOrderByCode, saveOrder, updateOrderStatus } from '../src/lib/orders/repository';

const TEST_EMAIL = 'order-smoke@balaio.invalid';
const TEST_NAME = 'Teste automatizado do banco';

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, encontrado ${String(actual)}.`);
  }
}

async function assertDevelopmentDatabase(): Promise<void> {
  const [official] = await db
    .select({ value: count() })
    .from(programCatalogs)
    .where(
      and(eq(programCatalogs.sourceKind, 'official'), eq(programCatalogs.status, 'published')),
    );

  if (official.value > 0) {
    throw new Error('Smoke de pedido bloqueado: existe catálogo oficial publicado.');
  }
}

async function reservedForProduct(slug: string): Promise<number> {
  const [row] = await db
    .select({ reserved: inventoryItems.reserved })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id))
    .innerJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
    .where(
      and(
        eq(products.slug, slug),
        eq(productVariants.isDefault, true),
        eq(productVariants.status, 'active'),
      ),
    )
    .limit(1);

  if (!row) throw new Error(`Estoque não encontrado para ${slug}.`);
  return row.reserved;
}

async function cleanupTestOrder(publicCode: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: orders.id, email: orders.email, name: orders.responsibleName })
      .from(orders)
      .where(eq(orders.publicCode, publicCode))
      .limit(1);

    if (!record) return;
    if (record.email !== TEST_EMAIL || record.name !== TEST_NAME) {
      throw new Error(`Limpeza recusada para pedido que não pertence ao smoke: ${publicCode}.`);
    }

    await tx.execute(
      sql`delete from payment_reconciliations where payment_attempt_id in (select id from payment_attempts where order_id = ${record.id})`,
    );
    await tx.delete(paymentAttempts).where(eq(paymentAttempts.orderId, record.id));
    await tx
      .delete(inventoryMovements)
      .where(
        sql`${inventoryMovements.orderItemId} in (select id from order_items where order_id = ${record.id})`,
      );
    await tx
      .delete(inventoryReservations)
      .where(
        sql`${inventoryReservations.orderItemId} in (select id from order_items where order_id = ${record.id})`,
      );
    await tx.delete(orderEvents).where(eq(orderEvents.orderId, record.id));
    await tx
      .delete(auditEvents)
      .where(and(eq(auditEvents.resourceType, 'order'), eq(auditEvents.resourceId, record.id)));
    await tx.execute(sql`delete from order_access_tokens where order_id = ${record.id}`);
    await tx.execute(sql`delete from order_consents where order_id = ${record.id}`);
    await tx.execute(sql`delete from order_addresses where order_id = ${record.id}`);
    await tx.delete(orderItems).where(eq(orderItems.orderId, record.id));
    await tx.delete(orders).where(eq(orders.id, record.id));
  });
}

async function main(): Promise<void> {
  await assertDevelopmentDatabase();

  const catalog = await getCartProducts();
  const product = catalog.find((candidate) => candidate.stock > 0 && candidate.stages.length > 0);
  if (!product) throw new Error('Nenhum produto elegível e com estoque para o smoke.');

  const baselineReserved = await reservedForProduct(product.slug);
  const idempotencyKey = randomUUID();
  const order: Order = {
    code: generateOrderCode(),
    status: 'awaiting_payment_link',
    createdAt: new Date().toISOString(),
    customer: {
      responsavelNome: TEST_NAME,
      responsavelCpf: '52998224725',
      email: TEST_EMAIL,
      telefone: '11999999999',
      estudanteNome: 'Não deve ser persistido',
      etapa: product.stages[0],
    },
    address: {
      cep: '01310100',
      logradouro: 'Avenida Paulista',
      numero: '1000',
      complemento: 'Teste interno',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    },
    items: [
      {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        quantity: 1,
        unitPriceInCents: product.priceInCents,
        lineTotalInCents: product.priceInCents,
      },
    ],
    subtotalInCents: product.priceInCents,
    shippingInCents: 0,
    totalInCents: product.priceInCents,
    benefitInCents: product.priceInCents,
    overBudgetInCents: 0,
    observacoes: 'Registro temporário criado pelo smoke do banco.',
  };

  let createdCode: string | null = null;
  try {
    const [first, retry] = await Promise.all([
      saveOrder(order, { idempotencyKey }),
      saveOrder(order, { idempotencyKey }),
    ]);
    createdCode = first.code;
    assertEqual('código devolvido no retry', retry.code, first.code);

    const [record] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.publicCode, first.code))
      .limit(1);
    if (!record) throw new Error('Pedido do smoke não foi persistido.');

    const [[reservationCount], [movementCount], [paymentCount], [eventCount], [auditCount]] =
      await Promise.all([
        db
          .select({ value: count() })
          .from(inventoryReservations)
          .innerJoin(orderItems, eq(orderItems.id, inventoryReservations.orderItemId))
          .where(eq(orderItems.orderId, record.id)),
        db
          .select({ value: count() })
          .from(inventoryMovements)
          .innerJoin(orderItems, eq(orderItems.id, inventoryMovements.orderItemId))
          .where(eq(orderItems.orderId, record.id)),
        db
          .select({ value: count() })
          .from(paymentAttempts)
          .where(eq(paymentAttempts.orderId, record.id)),
        db.select({ value: count() }).from(orderEvents).where(eq(orderEvents.orderId, record.id)),
        db
          .select({ value: count() })
          .from(auditEvents)
          .where(and(eq(auditEvents.resourceType, 'order'), eq(auditEvents.resourceId, record.id))),
      ]);

    assertEqual('reservas após criação idempotente', reservationCount.value, 1);
    assertEqual('movimentos após criação idempotente', movementCount.value, 1);
    assertEqual('tentativas de pagamento após criação idempotente', paymentCount.value, 1);
    assertEqual('eventos após criação idempotente', eventCount.value, 1);
    assertEqual('auditorias após criação idempotente', auditCount.value, 1);
    assertEqual(
      'estoque reservado após criação',
      await reservedForProduct(product.slug),
      baselineReserved + 1,
    );

    const hydrated = await getOrderByCode(first.code);
    if (!hydrated) throw new Error('Pedido do smoke não pôde ser reidratado.');
    assertEqual('nome do estudante não persistido', hydrated.customer.estudanteNome, undefined);

    const cancelled = await updateOrderStatus(first.code, 'cancelled');
    assertEqual('status após cancelamento', cancelled?.status, 'cancelled');
    const repeatedCancellation = await updateOrderStatus(first.code, 'cancelled');
    assertEqual('cancelamento repetido', repeatedCancellation?.status, 'cancelled');
    assertEqual(
      'estoque após cancelamento',
      await reservedForProduct(product.slug),
      baselineReserved,
    );

    const [released] = await db
      .select({ value: count() })
      .from(inventoryReservations)
      .innerJoin(orderItems, eq(orderItems.id, inventoryReservations.orderItemId))
      .where(and(eq(orderItems.orderId, record.id), eq(inventoryReservations.status, 'released')));
    const [movementsAfterCancel] = await db
      .select({ value: count() })
      .from(inventoryMovements)
      .innerJoin(orderItems, eq(orderItems.id, inventoryMovements.orderItemId))
      .where(eq(orderItems.orderId, record.id));
    assertEqual('reservas liberadas', released.value, 1);
    assertEqual('movimentos após cancelamento', movementsAfterCancel.value, 2);

    console.log(
      'Smoke de pedido passou: idempotência concorrente, reserva, pagamento, auditoria, cancelamento e liberação de estoque.',
    );
  } finally {
    if (createdCode) {
      const current = await getOrderByCode(createdCode);
      if (current && current.status !== 'cancelled') {
        await updateOrderStatus(createdCode, 'cancelled');
      }
      await cleanupTestOrder(createdCode);
    }
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error(`Smoke de pedido falhou: ${message}`);
  process.exitCode = 1;
});
