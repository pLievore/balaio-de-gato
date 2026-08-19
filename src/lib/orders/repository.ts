import 'server-only';

/**
 * Persistência de pedidos.
 *
 * O pedido, seus snapshots comerciais, a reserva de estoque, a tentativa de
 * pagamento e as trilhas de evento/auditoria nascem na mesma transação. Nada
 * neste módulo consulta o catálogo legado em arquivo.
 */

import { createHash, randomUUID } from 'node:crypto';

import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  auditEvents,
  inventoryItems,
  inventoryMovements,
  inventoryReservations,
  orderAddresses,
  orderConsents,
  orderEvents,
  orderItems,
  orders,
  paymentAttempts,
  products,
  productVariants,
  programCatalogs,
  programCatalogStages,
  programItems,
  programItemStages,
  schoolStages,
  variantProgramItems,
} from '../../db/schema';
import { createDuepayOrderReference } from '../payments/duepay';
import { MATERIAL_ESCOLAR_YEAR } from '../program/material-escolar';
import { protectJson, protectedLookup, revealJson } from '../security/protected-data';
import { maskCPF, stripCPF } from './cpf';
import {
  allowedTransitions,
  canTransition,
  isOrderCode,
  ORDER_STATUS_DESCRIPTION,
  type Order,
  type OrderStatus,
} from './order';

const DEVELOPMENT_CATALOG_VERSION = 'development-seed';
const DEFAULT_DEVELOPMENT_RESERVATION_TTL_MINUTES = 24 * 60;
const MAX_ORDER_LINES = 60;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function developmentCatalogAllowed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEVELOPMENT_CATALOG === 'true'
  );
}

const CHECKOUT_CONSENT = {
  policyKey: 'program-material-escolar-checkout',
  policyVersion: '1',
  text: 'Confirmo que os dados estão corretos e que a compra segue as regras do Programa Material Escolar.',
} as const;

type OrderHeader = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  responsibleName: string;
  responsibleCpfEncrypted: string;
  email: string;
  phone: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  benefitReferenceCents: number;
  notes: string | null;
  createdAt: Date;
  stageSlug: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
};

type HydratedOrderItem = {
  orderId: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

type CanonicalInputLine = {
  slug: string;
  quantity: number;
};

/** Mudança esperada entre a montagem do carrinho e o lock final do estoque. */
export class CheckoutChangedError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'CheckoutChangedError';
    this.issues = issues;
  }
}

function reservationTtlMinutes(): number {
  const configured = process.env.ORDER_RESERVATION_TTL_MINUTES?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ORDER_RESERVATION_TTL_MINUTES não está configurado.');
    }
    return DEFAULT_DEVELOPMENT_RESERVATION_TTL_MINUTES;
  }

  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('ORDER_RESERVATION_TTL_MINUTES deve ser um inteiro positivo.');
  }
  return value;
}

function checkoutConsentHash(): string {
  return createHash('sha256').update(CHECKOUT_CONSENT.text, 'utf8').digest('hex');
}

function canonicalizeInputLines(order: Order): CanonicalInputLine[] {
  if (order.items.length === 0 || order.items.length > MAX_ORDER_LINES) {
    throw new Error('O pedido precisa ter entre 1 e 60 linhas.');
  }

  const quantities = new Map<string, number>();
  for (const item of order.items) {
    if (!item.slug || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error('O pedido contém uma linha inválida.');
    }
    if (
      !Number.isSafeInteger(item.unitPriceInCents) ||
      item.unitPriceInCents < 0 ||
      item.lineTotalInCents !== item.unitPriceInCents * item.quantity
    ) {
      throw new Error(`O valor enviado para ${item.slug} é inválido.`);
    }
    quantities.set(item.slug, (quantities.get(item.slug) ?? 0) + item.quantity);
  }

  return [...quantities].map(([slug, quantity]) => ({ slug, quantity }));
}

function validateCheckoutIdentity(order: Order, idempotencyKey: string): string {
  if (!UUID_V4_PATTERN.test(idempotencyKey)) {
    throw new Error('A chave de idempotência do checkout é inválida.');
  }
  if (!isOrderCode(order.code)) {
    throw new Error('O código público do pedido é inválido.');
  }
  if (order.status !== 'awaiting_payment_link') {
    throw new Error('Um novo pedido precisa aguardar a conferência do pagamento.');
  }
  if (order.shippingInCents !== 0) {
    throw new Error('A entrega do Programa Material Escolar não pode ser cobrada.');
  }

  const cpf = stripCPF(order.customer.responsavelCpf);
  if (!/^\d{11}$/.test(cpf)) {
    throw new Error('O CPF do responsável é inválido.');
  }
  return cpf;
}

function orderHeaderSelection() {
  return {
    id: orders.id,
    publicCode: orders.publicCode,
    status: orders.status,
    responsibleName: orders.responsibleName,
    responsibleCpfEncrypted: orders.responsibleCpfEncrypted,
    email: orders.email,
    phone: orders.phone,
    subtotalCents: orders.subtotalCents,
    shippingCents: orders.shippingCents,
    totalCents: orders.totalCents,
    benefitReferenceCents: orders.benefitReferenceCents,
    notes: orders.notes,
    createdAt: orders.createdAt,
    stageSlug: schoolStages.slug,
    postalCode: orderAddresses.postalCode,
    street: orderAddresses.street,
    number: orderAddresses.number,
    complement: orderAddresses.complement,
    district: orderAddresses.district,
    city: orderAddresses.city,
    state: orderAddresses.state,
  };
}

function baseOrderHeaderQuery() {
  return db
    .select(orderHeaderSelection())
    .from(orders)
    .innerJoin(schoolStages, eq(schoolStages.id, orders.schoolStageId))
    .innerJoin(orderAddresses, eq(orderAddresses.orderId, orders.id));
}

async function hydrateOrders(headers: OrderHeader[]): Promise<Order[]> {
  if (headers.length === 0) return [];

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      slug: orderItems.productSlug,
      sku: orderItems.sku,
      name: orderItems.productName,
      brand: orderItems.brand,
      quantity: orderItems.quantity,
      unitPriceInCents: orderItems.unitPriceCents,
      lineTotalInCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        headers.map((header) => header.id),
      ),
    )
    .orderBy(asc(orderItems.orderId), asc(orderItems.lineNumber));

  const itemsByOrder = new Map<string, HydratedOrderItem[]>();
  for (const row of rows) {
    const current = itemsByOrder.get(row.orderId) ?? [];
    current.push(row);
    itemsByOrder.set(row.orderId, current);
  }

  return headers.map((header): Order => {
    if (header.shippingCents !== 0) {
      throw new Error(`Pedido ${header.publicCode} possui frete incompatível com o programa.`);
    }

    const hydratedItems = itemsByOrder.get(header.id) ?? [];
    return {
      code: header.publicCode,
      status: header.status,
      createdAt: header.createdAt.toISOString(),
      customer: {
        responsavelNome: header.responsibleName,
        responsavelCpf: revealJson<string>(header.responsibleCpfEncrypted),
        email: header.email,
        telefone: header.phone,
        etapa: header.stageSlug,
      },
      address: {
        cep: header.postalCode,
        logradouro: header.street,
        numero: header.number,
        ...(header.complement ? { complemento: header.complement } : {}),
        bairro: header.district,
        cidade: header.city,
        uf: header.state,
      },
      items: hydratedItems.map((item) => ({
        slug: item.slug,
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        lineTotalInCents: item.lineTotalInCents,
      })),
      subtotalInCents: header.subtotalCents,
      shippingInCents: 0,
      totalInCents: header.totalCents,
      benefitInCents: header.benefitReferenceCents,
      overBudgetInCents: Math.max(0, header.totalCents - header.benefitReferenceCents),
      ...(header.notes ? { observacoes: header.notes } : {}),
    };
  });
}

/**
 * Salva uma única vez a intenção de checkout identificada por UUID. Repetições
 * concorrentes devolvem o pedido já criado sem duplicar reserva ou pagamento.
 */
export async function saveOrder(
  order: Order,
  { idempotencyKey: rawIdempotencyKey }: { idempotencyKey: string },
): Promise<Order> {
  const idempotencyKey = rawIdempotencyKey.trim().toLowerCase();
  const cpf = validateCheckoutIdentity(order, idempotencyKey);
  const inputLines = canonicalizeInputLines(order);
  const correlationId = randomUUID();
  const expiresAt = new Date(Date.now() + reservationTtlMinutes() * 60_000);

  const publicCode = await db.transaction(async (tx): Promise<string> => {
    // Serializa todas as tentativas da mesma intenção antes mesmo de consultar
    // estoque. Sem este lock, uma repetição concorrente poderia enxergar o
    // saldo já reservado pela primeira requisição e falhar antes de alcançar o
    // ON CONFLICT da tabela de pedidos.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`);

    const [alreadyCreated] = await tx
      .select({ publicCode: orders.publicCode })
      .from(orders)
      .where(eq(orders.checkoutIdempotencyKey, idempotencyKey))
      .limit(1);
    if (alreadyCreated) return alreadyCreated.publicCode;

    const today = sql<string>`current_date`;
    const [officialCatalog] = await tx
      .select({
        id: programCatalogs.id,
        year: programCatalogs.year,
        sourceKind: programCatalogs.sourceKind,
        version: programCatalogs.version,
      })
      .from(programCatalogs)
      .where(
        and(
          eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
          eq(programCatalogs.sourceKind, 'official'),
          eq(programCatalogs.status, 'published'),
          or(isNull(programCatalogs.validFrom), lte(programCatalogs.validFrom, today)),
          or(isNull(programCatalogs.validUntil), gte(programCatalogs.validUntil, today)),
        ),
      )
      .orderBy(desc(programCatalogs.publishedAt), desc(programCatalogs.id))
      .limit(1);

    const [developmentCatalog] = officialCatalog || !developmentCatalogAllowed()
      ? []
      : await tx
          .select({
            id: programCatalogs.id,
            year: programCatalogs.year,
            sourceKind: programCatalogs.sourceKind,
            version: programCatalogs.version,
          })
          .from(programCatalogs)
          .where(
            and(
              eq(programCatalogs.year, MATERIAL_ESCOLAR_YEAR),
              eq(programCatalogs.sourceKind, 'development_seed'),
              eq(programCatalogs.version, DEVELOPMENT_CATALOG_VERSION),
              eq(programCatalogs.status, 'draft'),
            ),
          )
          .orderBy(desc(programCatalogs.updatedAt), desc(programCatalogs.id))
          .limit(1);

    const catalog = officialCatalog ?? developmentCatalog;
    if (!catalog) {
      throw new Error('Não há catálogo vigente do Programa Material Escolar para criar o pedido.');
    }
    const isDevelopmentCatalog = catalog.sourceKind === 'development_seed';

    const [stage] = await tx
      .select({
        id: schoolStages.id,
        slug: schoolStages.slug,
        benefitAmountCents: programCatalogStages.benefitAmountCents,
      })
      .from(schoolStages)
      .innerJoin(
        programCatalogStages,
        and(
          eq(programCatalogStages.stageId, schoolStages.id),
          eq(programCatalogStages.catalogId, catalog.id),
        ),
      )
      .where(and(eq(schoolStages.slug, order.customer.etapa), eq(schoolStages.isActive, true)))
      .limit(1);
    if (!stage) {
      throw new CheckoutChangedError(
        'A etapa selecionada não está mais disponível. Revise o carrinho.',
      );
    }

    /*
     * O ORDER BY define uma ordem global antes do FOR UPDATE. Assim dois
     * checkouts com os mesmos itens disputam os locks sem inverter a ordem.
     */
    const catalogRows = await tx
      .select({
        productId: products.id,
        productSlug: products.slug,
        productName: products.name,
        brand: products.brand,
        variantId: productVariants.id,
        variantName: productVariants.name,
        sku: productVariants.sku,
        unitPriceCents: productVariants.priceCents,
        maxPerOrder: productVariants.maxPerOrder,
        inventoryItemId: inventoryItems.id,
        onHand: inventoryItems.onHand,
        reserved: inventoryItems.reserved,
        programItemId: programItems.id,
        programItemCode: programItems.code,
        programItemDescription: programItems.officialDescription,
        maxUnitPriceCents: programItems.maxUnitPriceCents,
        programMaxQuantity: programItemStages.maxQuantity,
      })
      .from(products)
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.productId, products.id),
          eq(productVariants.isDefault, true),
          eq(productVariants.status, 'active'),
        ),
      )
      .innerJoin(inventoryItems, eq(inventoryItems.variantId, productVariants.id))
      .innerJoin(variantProgramItems, eq(variantProgramItems.variantId, productVariants.id))
      .innerJoin(
        programItems,
        and(
          eq(programItems.id, variantProgramItems.programItemId),
          eq(programItems.catalogId, catalog.id),
        ),
      )
      .innerJoin(
        programItemStages,
        and(
          eq(programItemStages.programItemId, programItems.id),
          eq(programItemStages.stageId, stage.id),
        ),
      )
      .where(
        and(
          eq(products.status, 'active'),
          inArray(
            products.slug,
            inputLines.map((line) => line.slug),
          ),
          isDevelopmentCatalog ? undefined : eq(variantProgramItems.isApproved, true),
        ),
      )
      .orderBy(asc(inventoryItems.id), asc(programItems.id))
      .for('update', { of: inventoryItems });

    const catalogBySlug = new Map<string, (typeof catalogRows)[number]>();
    for (const row of catalogRows) {
      if (catalogBySlug.has(row.productSlug)) {
        throw new Error(`O vínculo do produto ${row.productSlug} com o programa é ambíguo.`);
      }
      catalogBySlug.set(row.productSlug, row);
    }

    for (const input of inputLines) {
      const catalogLine = catalogBySlug.get(input.slug);
      if (!catalogLine) {
        throw new CheckoutChangedError(
          'Um material não está mais disponível para a etapa selecionada.',
        );
      }

      const submittedLines = order.items.filter((item) => item.slug === input.slug);
      if (submittedLines.some((item) => item.unitPriceInCents !== catalogLine.unitPriceCents)) {
        throw new CheckoutChangedError('O preço de um material mudou. Revise o carrinho.', [
          catalogLine.productName,
        ]);
      }
      if (
        catalogLine.maxUnitPriceCents !== null &&
        catalogLine.unitPriceCents > catalogLine.maxUnitPriceCents
      ) {
        throw new CheckoutChangedError(
          'Um material deixou de atender às regras do programa. Revise o carrinho.',
          [catalogLine.productName],
        );
      }

      const permittedQuantity = Math.min(
        catalogLine.maxPerOrder,
        catalogLine.programMaxQuantity ?? catalogLine.maxPerOrder,
      );
      if (input.quantity > permittedQuantity) {
        throw new CheckoutChangedError('A quantidade de um material passou do limite permitido.', [
          catalogLine.productName,
        ]);
      }
      if (input.quantity > catalogLine.onHand - catalogLine.reserved) {
        throw new CheckoutChangedError('O estoque mudou enquanto você enviava o pedido.', [
          catalogLine.productName,
        ]);
      }
    }

    const quantitiesByProgramItem = new Map<
      string,
      { quantity: number; maxQuantity: number | null; productName: string }
    >();
    for (const input of inputLines) {
      const catalogLine = catalogBySlug.get(input.slug);
      if (!catalogLine) continue;
      const current = quantitiesByProgramItem.get(catalogLine.programItemId);
      quantitiesByProgramItem.set(catalogLine.programItemId, {
        quantity: (current?.quantity ?? 0) + input.quantity,
        maxQuantity: catalogLine.programMaxQuantity,
        productName: current?.productName ?? catalogLine.productName,
      });
    }
    for (const aggregate of quantitiesByProgramItem.values()) {
      if (aggregate.maxQuantity !== null && aggregate.quantity > aggregate.maxQuantity) {
        throw new CheckoutChangedError(
          'A quantidade combinada de um material passou do limite permitido.',
          [aggregate.productName],
        );
      }
    }

    const subtotalCents = inputLines.reduce((total, input) => {
      const catalogLine = catalogBySlug.get(input.slug);
      if (!catalogLine) return total;
      return total + catalogLine.unitPriceCents * input.quantity;
    }, 0);

    const [createdOrder] = await tx
      .insert(orders)
      .values({
        publicCode: order.code.toUpperCase(),
        checkoutIdempotencyKey: idempotencyKey,
        status: 'awaiting_payment_link',
        programCatalogId: catalog.id,
        schoolStageId: stage.id,
        responsibleName: order.customer.responsavelNome.trim(),
        responsibleCpfEncrypted: protectJson(cpf),
        responsibleCpfHash: protectedLookup(cpf),
        responsibleCpfMasked: maskCPF(cpf),
        email: order.customer.email.trim().toLowerCase(),
        phone: order.customer.telefone.replace(/\D/g, ''),
        subtotalCents,
        shippingCents: 0,
        totalCents: subtotalCents,
        benefitReferenceCents: stage.benefitAmountCents,
        notes: order.observacoes?.trim() || null,
      })
      .onConflictDoNothing({ target: orders.checkoutIdempotencyKey })
      .returning({ id: orders.id, sequence: orders.sequence, publicCode: orders.publicCode });

    // Outra requisição com a mesma chave venceu a corrida enquanto os dados
    // eram revalidados. Nenhuma mutação dependente ocorreu até este ponto.
    if (!createdOrder) {
      const [concurrentOrder] = await tx
        .select({ publicCode: orders.publicCode })
        .from(orders)
        .where(eq(orders.checkoutIdempotencyKey, idempotencyKey))
        .limit(1);
      if (!concurrentOrder) {
        throw new Error('Não foi possível recuperar o pedido idempotente.');
      }
      return concurrentOrder.publicCode;
    }

    await tx.insert(orderAddresses).values({
      orderId: createdOrder.id,
      postalCode: order.address.cep.replace(/\D/g, ''),
      street: order.address.logradouro.trim(),
      number: order.address.numero.trim(),
      complement: order.address.complemento?.trim() || null,
      district: order.address.bairro.trim(),
      city: order.address.cidade.trim(),
      state: order.address.uf.trim().toUpperCase(),
    });

    await tx.insert(orderConsents).values({
      orderId: createdOrder.id,
      policyKey: CHECKOUT_CONSENT.policyKey,
      policyVersion: CHECKOUT_CONSENT.policyVersion,
      documentHash: checkoutConsentHash(),
    });

    const createdItems = await tx
      .insert(orderItems)
      .values(
        inputLines.map((input, index) => {
          const catalogLine = catalogBySlug.get(input.slug);
          if (!catalogLine) throw new Error(`Produto sem snapshot: ${input.slug}.`);
          return {
            orderId: createdOrder.id,
            lineNumber: index + 1,
            productId: catalogLine.productId,
            variantId: catalogLine.variantId,
            programItemId: catalogLine.programItemId,
            productSlug: catalogLine.productSlug,
            productName: catalogLine.productName,
            variantName: catalogLine.variantName,
            sku: catalogLine.sku,
            brand: catalogLine.brand,
            programItemCode: catalogLine.programItemCode,
            programItemDescription: catalogLine.programItemDescription,
            unitPriceCents: catalogLine.unitPriceCents,
            quantity: input.quantity,
            lineTotalCents: catalogLine.unitPriceCents * input.quantity,
          };
        }),
      )
      .returning({ id: orderItems.id, lineNumber: orderItems.lineNumber });

    const orderItemByLine = new Map(createdItems.map((item) => [item.lineNumber, item.id]));
    for (const [index, input] of inputLines.entries()) {
      const lineNumber = index + 1;
      const orderItemId = orderItemByLine.get(lineNumber);
      const catalogLine = catalogBySlug.get(input.slug);
      if (!orderItemId || !catalogLine) {
        throw new Error(`Não foi possível reservar a linha ${lineNumber}.`);
      }

      const [updatedInventory] = await tx
        .update(inventoryItems)
        .set({
          reserved: sql`${inventoryItems.reserved} + ${input.quantity}`,
          version: sql`${inventoryItems.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, catalogLine.inventoryItemId))
        .returning({
          onHand: inventoryItems.onHand,
          reserved: inventoryItems.reserved,
        });
      if (!updatedInventory) {
        throw new Error(`O estoque de ${input.slug} deixou de existir.`);
      }

      const [reservation] = await tx
        .insert(inventoryReservations)
        .values({
          inventoryItemId: catalogLine.inventoryItemId,
          orderItemId,
          quantity: input.quantity,
          status: 'active',
          expiresAt,
          idempotencyKey: `checkout:${idempotencyKey}:reservation:${lineNumber}`,
        })
        .returning({ id: inventoryReservations.id });

      await tx.insert(inventoryMovements).values({
        inventoryItemId: catalogLine.inventoryItemId,
        reservationId: reservation.id,
        orderItemId,
        type: 'reserve',
        onHandDelta: 0,
        reservedDelta: input.quantity,
        resultingOnHand: updatedInventory.onHand,
        resultingReserved: updatedInventory.reserved,
        reason: `Reserva criada para o pedido ${createdOrder.publicCode}.`,
        idempotencyKey: `checkout:${idempotencyKey}:movement:${lineNumber}`,
        correlationId,
      });
    }

    await tx.insert(paymentAttempts).values({
      orderId: createdOrder.id,
      attemptNumber: 1,
      provider: 'duepay_manual',
      providerReference: createDuepayOrderReference({
        orderSequence: createdOrder.sequence,
        attempt: 1,
        year: catalog.year,
      }),
      status: 'awaiting_link',
      amountCents: subtotalCents,
      currency: 'BRL',
      idempotencyKey: `checkout:${idempotencyKey}:payment:1`,
    });

    await tx.insert(orderEvents).values({
      orderId: createdOrder.id,
      eventType: 'order.created',
      fromStatus: null,
      toStatus: 'awaiting_payment_link',
      actorKind: 'customer',
      publicMessage: ORDER_STATUS_DESCRIPTION.awaiting_payment_link,
      visibleToCustomer: true,
      idempotencyKey: `checkout:${idempotencyKey}:order-created`,
      correlationId,
      metadata: {
        source: 'storefront',
        catalogSource: catalog.sourceKind,
        catalogVersion: catalog.version,
      },
    });

    await tx.insert(auditEvents).values({
      actorKind: 'customer',
      action: 'order.created',
      resourceType: 'order',
      resourceId: createdOrder.id,
      after: {
        publicCode: createdOrder.publicCode,
        status: 'awaiting_payment_link',
        stage: stage.slug,
        totalCents: subtotalCents,
      },
      metadata: { source: 'storefront' },
      idempotencyKey: `checkout:${idempotencyKey}:audit-order-created`,
      correlationId,
    });

    return createdOrder.publicCode;
  });

  const persisted = await getOrderByCode(publicCode);
  if (!persisted) throw new Error('O pedido foi salvo, mas não pôde ser recarregado.');
  return persisted;
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const [header] = await baseOrderHeaderQuery()
    .where(eq(orders.publicCode, code.toUpperCase()))
    .limit(1);
  if (!header) return null;
  const [order] = await hydrateOrders([header]);
  return order ?? null;
}

/**
 * Recupera o resultado de um checkout que já foi confirmado. O Server Action
 * consulta esta chave antes de reler o estoque, pois a primeira tentativa pode
 * ter sido concluída mesmo quando a resposta não chegou ao navegador.
 */
export async function getOrderByCheckoutIdempotencyKey(
  idempotencyKey: string,
): Promise<Order | null> {
  const normalizedKey = idempotencyKey.trim().toLowerCase();
  if (!UUID_V4_PATTERN.test(normalizedKey)) return null;

  const [header] = await baseOrderHeaderQuery()
    .where(eq(orders.checkoutIdempotencyKey, normalizedKey))
    .limit(1);
  if (!header) return null;
  const [order] = await hydrateOrders([header]);
  return order ?? null;
}

export async function listOrders(): Promise<Order[]> {
  const headers = await baseOrderHeaderQuery().orderBy(desc(orders.createdAt), desc(orders.id));
  return hydrateOrders(headers);
}

export async function updateOrderStatus(
  code: string,
  status: OrderStatus,
  options: { actor?: string; reason?: string } = {},
): Promise<Order | null> {
  const normalizedCode = code.toUpperCase();
  const updatedCode = await db.transaction(async (tx): Promise<string | null> => {
    const [current] = await tx
      .select({
        id: orders.id,
        publicCode: orders.publicCode,
        status: orders.status,
        paidAt: orders.paidAt,
        cancelledAt: orders.cancelledAt,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(eq(orders.publicCode, normalizedCode))
      .limit(1)
      .for('update');
    if (!current) return null;
    // Repetir a mesma transição é inofensivo: quem clicou duas vezes no painel
    // recebe o mesmo resultado em vez de um erro.
    if (current.status === status) return current.publicCode;

    if (!canTransition(current.status, status)) {
      throw new Error(
        `Transição ${current.status} → ${status} não é permitida. ` +
          `A partir de ${current.status} só é possível ir para: ` +
          `${allowedTransitions(current.status).join(', ') || 'nenhum estado'}.`,
      );
    }

    const now = new Date();
    const correlationId = randomUUID();

    /**
     * Reservas ativas do pedido, travadas para atualização. Cancelar devolve
     * o saldo à prateleira; confirmar o pagamento dá baixa de verdade.
     */
    const loadActiveReservations = () =>
      tx
        .select({
          reservationId: inventoryReservations.id,
          inventoryItemId: inventoryItems.id,
          orderItemId: orderItems.id,
          quantity: inventoryReservations.quantity,
          onHand: inventoryItems.onHand,
          reserved: inventoryItems.reserved,
        })
        .from(inventoryReservations)
        .innerJoin(orderItems, eq(orderItems.id, inventoryReservations.orderItemId))
        .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryReservations.inventoryItemId))
        .where(and(eq(orderItems.orderId, current.id), eq(inventoryReservations.status, 'active')))
        .orderBy(asc(inventoryItems.id), asc(inventoryReservations.id))
        .for('update', { of: [inventoryItems, inventoryReservations] });

    if (status === 'cancelled') {
      const activeReservations = await loadActiveReservations();

      for (const reservation of activeReservations) {
        if (reservation.reserved < reservation.quantity) {
          throw new Error(`A reserva do pedido ${current.publicCode} está inconsistente.`);
        }

        const [releasedInventory] = await tx
          .update(inventoryItems)
          .set({
            reserved: sql`${inventoryItems.reserved} - ${reservation.quantity}`,
            version: sql`${inventoryItems.version} + 1`,
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, reservation.inventoryItemId))
          .returning({
            onHand: inventoryItems.onHand,
            reserved: inventoryItems.reserved,
          });
        if (!releasedInventory) {
          throw new Error(`Estoque do pedido ${current.publicCode} não pôde ser liberado.`);
        }

        await tx
          .update(inventoryReservations)
          .set({
            status: 'released',
            releasedAt: now,
            releaseReason: 'Pedido cancelado.',
            updatedAt: now,
          })
          .where(eq(inventoryReservations.id, reservation.reservationId));

        await tx.insert(inventoryMovements).values({
          inventoryItemId: reservation.inventoryItemId,
          reservationId: reservation.reservationId,
          orderItemId: reservation.orderItemId,
          type: 'release',
          onHandDelta: 0,
          reservedDelta: -reservation.quantity,
          resultingOnHand: releasedInventory.onHand,
          resultingReserved: releasedInventory.reserved,
          reason: `Reserva liberada pelo cancelamento do pedido ${current.publicCode}.`,
          idempotencyKey: `order-status:${current.id}:cancel:${reservation.reservationId}`,
          correlationId,
        });
      }

      await tx
        .update(paymentAttempts)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(
          and(
            eq(paymentAttempts.orderId, current.id),
            inArray(paymentAttempts.status, [
              'not_started',
              'awaiting_link',
              'link_sent',
              'manual_review',
            ]),
          ),
        );
    }

    if (status === 'paid') {
      /*
       * Baixa de estoque. Reservar apenas segurava a peça (reserved += n);
       * pagar tira a peça da prateleira, então `onHand` e `reserved` caem
       * juntos e a reserva vira `consumed`. Sem este passo o saldo nunca
       * diminuiria e a loja venderia o que já saiu.
       */
      const activeReservations = await loadActiveReservations();

      for (const reservation of activeReservations) {
        if (reservation.reserved < reservation.quantity || reservation.onHand < reservation.quantity) {
          throw new Error(
            `O estoque do pedido ${current.publicCode} está inconsistente e não pode ser baixado.`,
          );
        }

        const [consumedInventory] = await tx
          .update(inventoryItems)
          .set({
            onHand: sql`${inventoryItems.onHand} - ${reservation.quantity}`,
            reserved: sql`${inventoryItems.reserved} - ${reservation.quantity}`,
            version: sql`${inventoryItems.version} + 1`,
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, reservation.inventoryItemId))
          .returning({
            onHand: inventoryItems.onHand,
            reserved: inventoryItems.reserved,
          });
        if (!consumedInventory) {
          throw new Error(`Estoque do pedido ${current.publicCode} não pôde ser baixado.`);
        }

        await tx
          .update(inventoryReservations)
          .set({ status: 'consumed', consumedAt: now, updatedAt: now })
          .where(eq(inventoryReservations.id, reservation.reservationId));

        await tx.insert(inventoryMovements).values({
          inventoryItemId: reservation.inventoryItemId,
          reservationId: reservation.reservationId,
          orderItemId: reservation.orderItemId,
          type: 'consume',
          onHandDelta: -reservation.quantity,
          reservedDelta: -reservation.quantity,
          resultingOnHand: consumedInventory.onHand,
          resultingReserved: consumedInventory.reserved,
          reason: `Estoque baixado pelo pagamento do pedido ${current.publicCode}.`,
          idempotencyKey: `order-status:${current.id}:consume:${reservation.reservationId}`,
          correlationId,
        });
      }

      await tx
        .update(paymentAttempts)
        .set({ status: 'authorized', authorizedAt: now, updatedAt: now })
        .where(
          and(
            eq(paymentAttempts.orderId, current.id),
            inArray(paymentAttempts.status, [
              'not_started',
              'awaiting_link',
              'link_sent',
              'manual_review',
            ]),
          ),
        );
    }

    if (status === 'payment_link_sent') {
      await tx
        .update(paymentAttempts)
        .set({ status: 'link_sent', linkSentAt: now, updatedAt: now })
        .where(
          and(
            eq(paymentAttempts.orderId, current.id),
            inArray(paymentAttempts.status, ['not_started', 'awaiting_link', 'manual_review']),
          ),
        );
    }

    if (status === 'manual_review') {
      await tx
        .update(paymentAttempts)
        .set({ status: 'manual_review', updatedAt: now })
        .where(
          and(
            eq(paymentAttempts.orderId, current.id),
            inArray(paymentAttempts.status, ['not_started', 'awaiting_link', 'link_sent']),
          ),
        );
    }

    await tx
      .update(orders)
      .set({
        status,
        updatedAt: now,
        // Cada carimbo é gravado uma vez só: reentrar num estado não reescreve
        // a data em que ele aconteceu pela primeira vez.
        paidAt: status === 'paid' ? (current.paidAt ?? now) : current.paidAt,
        cancelledAt: status === 'cancelled' ? (current.cancelledAt ?? now) : current.cancelledAt,
        deliveredAt: status === 'delivered' ? (current.deliveredAt ?? now) : current.deliveredAt,
      })
      .where(eq(orders.id, current.id));

    const eventType =
      status === 'cancelled'
        ? 'order.cancelled'
        : status === 'paid'
          ? 'order.paid'
          : status === 'delivered'
            ? 'order.delivered'
            : 'order.status_changed';

    const eventIdempotencyKey = `order-status:${current.id}:${status}:${correlationId}`;
    await tx.insert(orderEvents).values({
      orderId: current.id,
      eventType,
      fromStatus: current.status,
      toStatus: status,
      actorKind: 'system',
      reason: options.reason ?? null,
      publicMessage: ORDER_STATUS_DESCRIPTION[status],
      visibleToCustomer: true,
      idempotencyKey: eventIdempotencyKey,
      correlationId,
      metadata: options.actor ? { actor: options.actor } : {},
    });

    await tx.insert(auditEvents).values({
      actorKind: 'system',
      action: eventType,
      resourceType: 'order',
      resourceId: current.id,
      before: { status: current.status },
      after: { status },
      metadata: { publicCode: current.publicCode, ...(options.actor ? { actor: options.actor } : {}) },
      idempotencyKey: `${eventIdempotencyKey}:audit`,
      correlationId,
    });

    return current.publicCode;
  });

  return updatedCode ? getOrderByCode(updatedCode) : null;
}

/** Um código já em uso não pode ser reaproveitado em outro pedido. */
export async function orderCodeExists(code: string): Promise<boolean> {
  const [record] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.publicCode, code.toUpperCase()))
    .limit(1);
  return Boolean(record);
}
