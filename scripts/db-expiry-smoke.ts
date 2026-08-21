/**
 * Smoke do vencimento de reserva.
 *
 * A reserva nascia com `expires_at` e ninguém lia: todo checkout abandonado
 * tirava a peça da prateleira para sempre. Este smoke prova o caminho inteiro —
 * saldo volta, reserva vira `expired`, sai movimento de `release` e o pedido
 * cai em `manual_review`, para a loja decidir em vez de virar `paid` sem baixa.
 *
 * O tempo é simulado passando `now` adiante, e não mexendo em `expires_at`: a
 * restrição `expires_at > created_at` proíbe gravar um vencimento no passado.
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
import { releaseExpiredReservations } from '../src/lib/orders/repository';

const TEST_EMAIL = 'expiry-smoke@balaio.invalid';

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, encontrado ${String(actual)}.`);
  }
}

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
  form.set('responsavelNome', 'Teste de vencimento');
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
  form.set('observacoes', 'Registro temporário do smoke de vencimento.');
  form.set('aceiteRegras', 'on');
  return form;
}

async function readInventory(slug: string) {
  const [row] = await db
    .select({ onHand: inventoryItems.onHand, reserved: inventoryItems.reserved })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(productVariants.id, inventoryItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(products.slug, slug))
    .limit(1);
  if (!row) throw new Error(`Sem estoque cadastrado para ${slug}.`);
  return row;
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
  for (const item of items) {
    await db.delete(inventoryMovements).where(eq(inventoryMovements.orderItemId, item.id));
    await db.delete(inventoryReservations).where(eq(inventoryReservations.orderItemId, item.id));
  }

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
    const reservado = await readInventory(target.slug);
    assertEqual('reserved após a reserva', reservado.reserved, antes.reserved + QUANTIDADE);

    // Nada vence antes da hora: varrer agora não pode mexer em nada.
    const cedo = await releaseExpiredReservations(new Date());
    assertEqual('liberações antes do vencimento', cedo.releasedReservations, 0);

    // Um ano à frente: qualquer TTL configurado já venceu.
    const futuro = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const vencido = await releaseExpiredReservations(futuro);
    if (vencido.releasedReservations < 1) {
      throw new Error('A varredura não liberou a reserva vencida.');
    }

    const depois = await readInventory(target.slug);
    assertEqual('reserved após o vencimento', depois.reserved, antes.reserved);
    assertEqual('on_hand não pode mudar ao vencer', depois.onHand, antes.onHand);

    const [reserva] = await db
      .select({ status: inventoryReservations.status })
      .from(inventoryReservations)
      .innerJoin(orderItems, eq(orderItems.id, inventoryReservations.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orders.publicCode, code))
      .limit(1);
    assertEqual('reserva após o vencimento', reserva?.status, 'expired');

    const [movimento] = await db
      .select({ value: count() })
      .from(inventoryMovements)
      .innerJoin(orderItems, eq(orderItems.id, inventoryMovements.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.publicCode, code), eq(inventoryMovements.type, 'release')));
    assertEqual('movimentos de liberação registrados', movimento?.value, 1);

    const [pedido] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.publicCode, code))
      .limit(1);
    // Sem isto, confirmar o pagamento viraria `paid` sem baixar estoque: o
    // laço de consumo só enxerga reservas ativas, e não sobrou nenhuma.
    assertEqual('pedido após o vencimento', pedido?.status, 'manual_review');

    // Varrer de novo não pode liberar a mesma reserva duas vezes.
    const repetido = await releaseExpiredReservations(futuro);
    assertEqual('segunda varredura', repetido.releasedReservations, 0);
    const estavel = await readInventory(target.slug);
    assertEqual('reserved após varrer de novo', estavel.reserved, antes.reserved);

    console.log(`OK: reserva do pedido ${code} venceu, devolveu o saldo e caiu em manual_review.`);
  } finally {
    await cleanup(code);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
