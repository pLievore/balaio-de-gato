import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '../../../../src/lib/square';
import { markOrderPaidAtomic, getOrderForConfirmation } from '../../../../src/lib/orders';
import { sendOrderConfirmation, isEmailConfigured } from '../../../../src/lib/email';
import { supabaseAdmin } from '../../../../src/lib/supabase/admin';

// Square requires a 200 response within 10s. Do NOT throw — log and return 200 always.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature') ?? '';
  const notificationUrl = req.url;

  if (!verifyWebhookSignature({ rawBody, signatureHeader, notificationUrl })) {
    console.error(JSON.stringify({ event: 'square_webhook_invalid_signature', url: req.url }));
    return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(JSON.stringify({ event: 'square_webhook_parse_error' }));
    return NextResponse.json({ ok: false, reason: 'parse_error' }, { status: 200 });
  }

  const event = payload as {
    event_id?: string;
    type?: string;
    data?: {
      object?: {
        payment?: {
          id?: string;
          order_id?: string;
          status?: string;
          reference_id?: string;
        };
      };
    };
  };

  const eventType = event.type ?? '';
  const payment = event.data?.object?.payment;

  if (
    (eventType === 'payment.created' || eventType === 'payment.updated') &&
    payment?.status === 'COMPLETED' &&
    payment?.id
  ) {
    const squarePaymentId = payment.id;
    const squareOrderId = payment.order_id ?? '';
    const referenceId = payment.reference_id ?? '';

    try {
      // Resolve our internal order. Primary lookup: square_order_id (always populated
      // on payment events). Fallbacks: reference_id (if Square propagated it) and
      // a final lookup by id (legacy orders that pre-date this fix).
      let orderRow: { id: string; square_checkout_id: string | null } | null = null;

      if (squareOrderId) {
        const { data } = await supabaseAdmin
          .from('orders')
          .select('id, square_checkout_id')
          .eq('square_order_id', squareOrderId)
          .maybeSingle();
        orderRow = data ?? null;
      }

      if (!orderRow && referenceId) {
        const { data } = await supabaseAdmin
          .from('orders')
          .select('id, square_checkout_id')
          .eq('id', referenceId)
          .maybeSingle();
        orderRow = data ?? null;
      }

      if (!orderRow?.square_checkout_id) {
        console.error(
          JSON.stringify({
            event: 'square_webhook_order_not_found',
            squareOrderId,
            referenceId,
            squarePaymentId,
            eventId: event.event_id,
          }),
        );
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      const result = await markOrderPaidAtomic({
        squareCheckoutId: orderRow.square_checkout_id,
        squarePaymentId,
      });

      console.log(
        JSON.stringify({
          event: 'square_webhook_processed',
          status: result.status,
          orderId: orderRow.id,
          eventId: event.event_id,
        }),
      );

      // Send confirmation email only on the first transition to paid.
      if (result.status === 'paid' && isEmailConfigured()) {
        const orderData = await getOrderForConfirmation(orderRow.id);
        if (orderData) {
          const emailResult = await sendOrderConfirmation({
            orderNumber: orderData.orderNumber,
            to: orderData.email,
            customerName: orderData.customerName,
            items: orderData.items,
            subtotalCents: orderData.subtotalCents,
            taxCents: orderData.taxCents,
            shippingCents: orderData.shippingCents,
            totalCents: orderData.totalCents,
          });
          if (!emailResult.ok) {
            console.error(
              JSON.stringify({
                event: 'square_webhook_email_failed',
                reason: emailResult.reason,
                orderId: orderRow.id,
              }),
            );
          }
        }
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'square_webhook_processing_error',
          error: err instanceof Error ? err.message : String(err),
          squareOrderId,
          squarePaymentId,
        }),
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
