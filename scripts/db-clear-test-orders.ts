import { eq, inArray, like } from 'drizzle-orm';

import { db, pool } from '../src/db/client';
import { updateOrderStatus } from '../src/lib/orders/repository';
import {
  inventoryItems,
  inventoryMovements,
  inventoryReservations,
  orderAccessTokens,
  orderAddresses,
  orderConsents,
  orderEvents,
  orderItems,
  orders,
  paymentAttempts,
  paymentReconciliations,
  productVariants,
  products,
} from '../src/db/schema';

/** Remove os pedidos de teste e devolve ao estoque o que eles ainda seguravam. */
async function main(): Promise<void> {
  const alvos = await db
    .select({ id: orders.id, code: orders.publicCode, status: orders.status })
    .from(orders)
    .where(like(orders.email, '%@balaio.invalid'));

  console.log('pedidos de teste:', alvos.map((o) => `${o.code}/${o.status}`).join(' ') || 'nenhum');

  for (const order of alvos) {
    // Libera o estoque pelo caminho real do domínio, em vez de mexer nos
    // números à mão: quem sabe soltar uma reserva é a própria transição.
    if (order.status !== 'cancelled' && order.status !== 'delivered') {
      try {
        await updateOrderStatus(order.code, 'cancelled');
      } catch {
        // Pedido já pago não cancela; a reserva dele virou baixa e não volta.
      }
    }

    const items = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const ids = items.map((i) => i.id);
    if (ids.length > 0) {
      await db.delete(inventoryMovements).where(inArray(inventoryMovements.orderItemId, ids));
      await db.delete(inventoryReservations).where(inArray(inventoryReservations.orderItemId, ids));
    }

    const attempts = await db
      .select({ id: paymentAttempts.id })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, order.id));
    if (attempts.length > 0) {
      await db.delete(paymentReconciliations).where(
        inArray(
          paymentReconciliations.paymentAttemptId,
          attempts.map((a) => a.id),
        ),
      );
    }

    await db.delete(paymentAttempts).where(eq(paymentAttempts.orderId, order.id));
    await db.delete(orderAccessTokens).where(eq(orderAccessTokens.orderId, order.id));
    await db.delete(orderConsents).where(eq(orderConsents.orderId, order.id));
    await db.delete(orderAddresses).where(eq(orderAddresses.orderId, order.id));
    await db.delete(orderEvents).where(eq(orderEvents.orderId, order.id));
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
    console.log('  removido', order.code);
  }

  // Confere que nenhum estoque ficou com reserva pendurada.
  const presos = await db
    .select({ slug: products.slug, reserved: inventoryItems.reserved })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId));
  const comReserva = presos.filter((p) => p.reserved !== 0);
  console.log(
    'itens com reserva pendurada:',
    comReserva.length === 0 ? 'nenhum' : comReserva.map((p) => `${p.slug}=${p.reserved}`).join(' '),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
