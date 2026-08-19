import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { getVariantForCart } from './products';
import type { Address, CustomerInput } from './schemas';
import type { Database } from './supabase/database.types';

export type OrderLineInput = {
  variantId: string;
  quantity: number;
};

export type CreatePendingOrderInput = {
  customer: CustomerInput;
  shippingAddress: Address;
  lines: OrderLineInput[];
  /** Supabase auth user ID, when the buyer is signed in. */
  authUserId?: string | null;
};

/**
 * Finds or creates a customer row matching the given identifiers.
 * - If `authUserId` is provided, prefer matching by auth_user_id.
 * - Otherwise, match by email.
 * - Missing fields on existing rows are filled in (auth_user_id, full_name, phone).
 */
async function findOrCreateCustomer(args: {
  email: string;
  fullName: string;
  phone: string | null;
  authUserId: string | null;
}): Promise<string> {
  if (args.authUserId) {
    const { data: byAuth } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, phone')
      .eq('auth_user_id', args.authUserId)
      .maybeSingle();
    if (byAuth) {
      const updates: Database['public']['Tables']['customers']['Update'] = {};
      if (!byAuth.full_name && args.fullName) updates.full_name = args.fullName;
      if (!byAuth.phone && args.phone) updates.phone = args.phone;
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('customers').update(updates).eq('id', byAuth.id);
      }
      return byAuth.id;
    }
  }

  const { data: byEmail } = await supabaseAdmin
    .from('customers')
    .select('id, auth_user_id, full_name, phone')
    .eq('email', args.email)
    .maybeSingle();

  if (byEmail) {
    const updates: Database['public']['Tables']['customers']['Update'] = {};
    if (args.authUserId && !byEmail.auth_user_id) updates.auth_user_id = args.authUserId;
    if (!byEmail.full_name && args.fullName) updates.full_name = args.fullName;
    if (!byEmail.phone && args.phone) updates.phone = args.phone;
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('customers').update(updates).eq('id', byEmail.id);
    }
    return byEmail.id;
  }

  const { data: created, error } = await supabaseAdmin
    .from('customers')
    .insert({
      email: args.email,
      full_name: args.fullName,
      phone: args.phone,
      auth_user_id: args.authUserId,
    })
    .select('id')
    .single();
  if (error || !created) throw new Error(`customer_create_failed: ${error?.message ?? 'unknown'}`);
  return created.id;
}

export type CreatePendingOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: number;
      subtotalCents: number;
      taxCents: number;
      shippingCents: number;
      totalCents: number;
      lineItems: Array<{
        variantId: string;
        sku: string;
        productName: string;
        variantName: string;
        unitPriceCents: number;
        quantity: number;
        lineTotalCents: number;
      }>;
    }
  | { ok: false; reason: string; details?: string };

/**
 * Validates stock for every line and creates a `pending` order with snapshotted line items.
 * Tax and shipping are 0 for now (added in Phase 3 / when Mayer enables them).
 *
 * Stock is *not* decremented here — that happens atomically when the Square webhook
 * confirms payment via the mark_order_paid SQL function.
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<CreatePendingOrderResult> {
  if (input.lines.length === 0) {
    return { ok: false, reason: 'empty_cart' };
  }

  const validated: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }> = [];

  for (const line of input.lines) {
    if (line.quantity < 1) {
      return { ok: false, reason: 'invalid_quantity' };
    }
    const variant = await getVariantForCart(line.variantId);
    if (!variant) {
      return {
        ok: false,
        reason: 'variant_unavailable',
        details: `Variant ${line.variantId} not available`,
      };
    }
    if (variant.stockQty < line.quantity) {
      return {
        ok: false,
        reason: 'insufficient_stock',
        details: `${variant.productName}: only ${variant.stockQty} in stock`,
      };
    }
    validated.push({
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.productName,
      variantName: variant.variantName,
      unitPriceCents: variant.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: variant.unitPriceCents * line.quantity,
    });
  }

  const subtotalCents = validated.reduce((c, l) => c + l.lineTotalCents, 0);
  const taxCents = 0;
  const shippingCents = 0;
  const totalCents = subtotalCents + taxCents + shippingCents;

  let customerId: string;
  try {
    customerId = await findOrCreateCustomer({
      email: input.customer.email,
      fullName: input.customer.fullName,
      phone: input.customer.phone || null,
      authUserId: input.authUserId ?? null,
    });
  } catch (e) {
    return {
      ok: false,
      reason: 'customer_link_failed',
      details: e instanceof Error ? e.message : 'unknown',
    };
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      email: input.customer.email,
      status: 'pending',
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      shipping_address:
        input.shippingAddress as unknown as import('./supabase/database.types').Json,
      billing_address: input.shippingAddress as unknown as import('./supabase/database.types').Json,
      notes: input.customer.fullName,
    })
    .select('id, order_number')
    .single();

  if (orderErr || !order) {
    return {
      ok: false,
      reason: 'order_insert_failed',
      details: orderErr?.message,
    };
  }

  const itemsPayload = validated.map((l) => ({
    order_id: order.id,
    variant_id: l.variantId,
    product_name: l.productName,
    variant_name: l.variantName,
    sku: l.sku,
    unit_price_cents: l.unitPriceCents,
    quantity: l.quantity,
    line_total_cents: l.lineTotalCents,
  }));

  const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(itemsPayload);

  if (itemsErr) {
    // Clean up the orphan order
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return {
      ok: false,
      reason: 'order_items_insert_failed',
      details: itemsErr.message,
    };
  }

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents,
    lineItems: validated,
  };
}

export async function attachSquareCheckout(args: {
  orderId: string;
  checkoutId: string;
  squareOrderId: string | null;
}): Promise<void> {
  await supabaseAdmin
    .from('orders')
    .update({
      square_checkout_id: args.checkoutId,
      square_order_id: args.squareOrderId,
    })
    .eq('id', args.orderId);
}

export async function getOrderForConfirmation(orderId: string): Promise<{
  id: string;
  orderNumber: number;
  email: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  customerName: string | null;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    lineTotalCents: number;
  }>;
} | null> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      `id, order_number, email, status, subtotal_cents, tax_cents, shipping_cents, total_cents, notes,
       order_items ( product_name, sku, quantity, line_total_cents )`,
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) return null;

  const row = order as unknown as {
    id: string;
    order_number: number;
    email: string;
    status: string;
    subtotal_cents: number;
    tax_cents: number;
    shipping_cents: number;
    total_cents: number;
    notes: string | null;
    order_items: Array<{
      product_name: string;
      sku: string;
      quantity: number;
      line_total_cents: number;
    }>;
  };

  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    customerName: row.notes,
    items: row.order_items.map((i) => ({
      productName: i.product_name,
      sku: i.sku,
      quantity: i.quantity,
      lineTotalCents: i.line_total_cents,
    })),
  };
}

type MarkPaidResult = {
  status: 'paid' | 'already_paid' | 'order_not_found' | 'invalid_state';
  order_id?: string;
  current?: string;
};

export async function markOrderPaidAtomic(args: {
  squareCheckoutId: string;
  squarePaymentId: string;
}): Promise<MarkPaidResult> {
  const { data, error } = await supabaseAdmin.rpc('mark_order_paid', {
    p_checkout_id: args.squareCheckoutId,
    p_payment_id: args.squarePaymentId,
  });
  if (error) throw error;
  return data as unknown as MarkPaidResult;
}
