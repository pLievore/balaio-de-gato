/**
 * Smoke do ciclo de vida do pedido depois do envio.
 *
 * O `db-order-smoke` cobre criação, reserva e cancelamento. Este cobre o
 * caminho para frente — link enviado, pago, separação, entrega — e verifica a
 * parte que mexe em inventário de verdade: confirmar o pagamento tem de tirar
 * a peça da prateleira (`on_hand` cai junto com `reserved`), não apenas soltar
 * a reserva.
 *
 * Roda contra o banco de desenvolvimento e limpa o que criou.
 */

import { randomUUID } from 'node:crypto';

import { and, count, eq } from 'drizzle-orm';

import { submitOrder } from '../app/(public)/checkout/actions';
import { db, pool } from '../src/db/client';
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
  products,
  productVariants,
  programCatalogs,
} from '../src/db/schema';
import { getCartProducts } from '../src/lib/catalog/repository';
import { updateOrderStatus } from '../src/lib/orders/repository';

const TEST_EMAIL = 'fulfillment-smoke@balaio.invalid';

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, encontrado ${String(actual)}.`);
  }
}

/** Recusa rodar contra um banco que já tenha catálogo oficial publicado. */
async function assertDevelopmentDatabase(): Promise<void> {
  const [official] = await db
    .select({ value: count() })
    .from(programCatalogs)
    .where(eq(programCatalogs.status, 'published'));
  if ((official?.value ?? 0) > 0) {
    throw new Error('Há catálogo publicado neste banco. O smoke não roda em produção.');
  }
}

function checkoutForm(slug: string, quantity: number): FormData {
  const form = new FormData();
  form.set('checkoutIdempotencyKey', randomUUID());
  form.set('linhas', JSON.stringify([{ slug, quantity }]));
  form.set('responsavelNome', 'Teste de expedição');
  form.set('responsavelCpf', '52998224725');
  form.set('email', TEST_EMAIL);
  form.set('telefone', '11999999999');
  form.set('etapa', 'alfabetizacao');
  form.set('cep', '01310100');
  form.set('logradouro', 'Avenida Paulista');
  form.set('numero', '1000');
  form.set('bairro', 'Bela Vista');
  form.set('cidade', 'São Paulo');
  form.set('uf', 'SP');
  form.set('observacoes', 'Registro temporário do smoke de expedição.');
  form.set('aceiteRegras', 'on');
  return form;
}

async function readInventory(slug: string) {
  const [row] = await db
    .select({
      id: inventoryItems.id,
      onHand: inventoryItems.onHand,
      reserved: inventoryItems.reserved,
    })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(products.slug, slug))
    .limit(1);
  if (!row) throw new Error(`Sem estoque cadastrado para ${slug}.`);
  return row;
}

async function orderIdFor(code: string): Promise<string> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.publicCode, code))
    .limit(1);
  if (!row) throw new Error(`Pedido ${code} não encontrado.`);
  return row.id;
}

async function cleanup(code: string): Promise<void> {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.publicCode, code))
    .limit(1);
  if (!order) return;

  const items = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  const itemIds = items.map((item) => item.id);

  for (const itemId of itemIds) {
    await db.delete(inventoryMovements).where(eq(inventoryMovements.orderItemId, itemId));
    await db.delete(inventoryReservations).where(eq(inventoryReservations.orderItemId, itemId));
  }
  // A ordem importa: tudo que aponta para o pedido sai antes dele.
  const attempts = await db
    .select({ id: paymentAttempts.id })
    .from(paymentAttempts)
    .where(eq(paymentAttempts.orderId, order.id));
  for (const attempt of attempts) {
    await db
      .delete(paymentReconciliations)
      .where(eq(paymentReconciliations.paymentAttemptId, attempt.id));
  }
  await db.delete(paymentAttempts).where(eq(paymentAttempts.orderId, order.id));
  await db.delete(orderAccessTokens).where(eq(orderAccessTokens.orderId, order.id));
  await db.delete(orderConsents).where(eq(orderConsents.orderId, order.id));
  await db.delete(orderAddresses).where(eq(orderAddresses.orderId, order.id));
  await db.delete(orderEvents).where(eq(orderEvents.orderId, order.id));
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));
}

async function main(): Promise<void> {
  await assertDevelopmentDatabase();

  const catalog = await getCartProducts();
  const target = catalog.find(
    (product) => product.stock > 5 && product.stages.includes('alfabetizacao'),
  );
  if (!target) throw new Error('Nenhum produto elegível com estoque suficiente para o smoke.');

  const QUANTIDADE = 2;
  const antes = await readInventory(target.slug);

  const created = await submitOrder({ status: 'idle' }, checkoutForm(target.slug, QUANTIDADE));
  if (created.status !== 'success') {
    throw new Error(`Pedido não foi criado: ${JSON.stringify(created)}`);
  }
  const code = created.order.code;

  try {
    // Reserva feita: a peça foi segurada, mas ainda está fisicamente na loja.
    const reservado = await readInventory(target.slug);
    assertEqual('on_hand após a reserva', reservado.onHand, antes.onHand);
    assertEqual('reserved após a reserva', reservado.reserved, antes.reserved + QUANTIDADE);

    // Link enviado.
    const linkSent = await updateOrderStatus(code, 'payment_link_sent');
    assertEqual('status após enviar o link', linkSent?.status, 'payment_link_sent');
    const [attempt] = await db
      .select({ status: paymentAttempts.status })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, await orderIdFor(code)))
      .limit(1);
    assertEqual('tentativa de pagamento após o link', attempt?.status, 'link_sent');

    // Pagamento confirmado: aqui a peça sai da prateleira.
    const paid = await updateOrderStatus(code, 'paid');
    assertEqual('status após confirmar o pagamento', paid?.status, 'paid');

    const pago = await readInventory(target.slug);
    assertEqual('on_hand após o pagamento', pago.onHand, antes.onHand - QUANTIDADE);
    assertEqual('reserved após o pagamento', pago.reserved, antes.reserved);

    const [reservaConsumida] = await db
      .select({ status: inventoryReservations.status })
      .from(inventoryReservations)
      .innerJoin(orderItems, eq(orderItems.id, inventoryReservations.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orders.publicCode, code))
      .limit(1);
    assertEqual('reserva após o pagamento', reservaConsumida?.status, 'consumed');

    const [movimento] = await db
      .select({ value: count() })
      .from(inventoryMovements)
      .innerJoin(orderItems, eq(orderItems.id, inventoryMovements.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.publicCode, code), eq(inventoryMovements.type, 'consume')));
    assertEqual('movimentos de baixa registrados', movimento?.value, 1);

    // Repetir a confirmação não pode baixar o estoque duas vezes.
    await updateOrderStatus(code, 'paid');
    const repetido = await readInventory(target.slug);
    assertEqual('on_hand após repetir o pagamento', repetido.onHand, antes.onHand - QUANTIDADE);

    // Cancelar depois de pago tem de ser recusado.
    let recusou = false;
    try {
      await updateOrderStatus(code, 'cancelled');
    } catch {
      recusou = true;
    }
    assertEqual('cancelamento após o pagamento é recusado', recusou, true);

    // Resto do caminho até a entrega.
    assertEqual(
      'status após iniciar separação',
      (await updateOrderStatus(code, 'preparing'))?.status,
      'preparing',
    );
    assertEqual(
      'status após sair para entrega',
      (await updateOrderStatus(code, 'out_for_delivery'))?.status,
      'out_for_delivery',
    );
    const entregue = await updateOrderStatus(code, 'delivered');
    assertEqual('status após entregar', entregue?.status, 'delivered');

    // Pular etapa continua proibido.
    let pulouRecusado = false;
    try {
      await updateOrderStatus(code, 'paid');
    } catch {
      pulouRecusado = true;
    }
    assertEqual('voltar de entregue para pago é recusado', pulouRecusado, true);

    console.log(
      'Smoke de expedição passou: link enviado, baixa de estoque no pagamento, ' +
        'idempotência da baixa, recusa de cancelamento após pago e caminho até a entrega.',
    );
  } finally {
    await cleanup(code);
    // O estoque volta ao ponto de partida para o smoke poder rodar de novo.
    await db
      .update(inventoryItems)
      .set({ onHand: antes.onHand, reserved: antes.reserved })
      .where(eq(inventoryItems.id, antes.id));
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
