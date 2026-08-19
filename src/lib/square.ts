import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SquareClient, SquareEnvironment } from 'square';

type SquareConfig = {
  accessToken: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  webhookSignatureKey: string;
};

function readConfig(): SquareConfig | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const env = process.env.SQUARE_ENVIRONMENT;
  const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!accessToken || !locationId || !webhookSignatureKey) return null;

  return {
    accessToken,
    locationId,
    environment: env === 'production' ? 'production' : 'sandbox',
    webhookSignatureKey,
  };
}

export function isSquareConfigured(): boolean {
  return readConfig() !== null;
}

let _client: SquareClient | null = null;

function getClient(config: SquareConfig): SquareClient {
  if (_client) return _client;
  _client = new SquareClient({
    token: config.accessToken,
    environment:
      config.environment === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
  return _client;
}

export type CreateCheckoutInput = {
  idempotencyKey: string;
  orderId: string;
  redirectUrl: string;
  buyerEmail?: string;
  buyerPhone?: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
    note?: string;
  }>;
};

export type CreateCheckoutResult = {
  url: string;
  checkoutId: string;
  /** Square's Order ID — always populated on payment webhooks, used as primary lookup key. */
  squareOrderId: string | null;
};

/**
 * Creates a Square Hosted Checkout payment link.
 * Throws if Square is not configured — callers should check isSquareConfigured() first.
 */
export async function createCheckoutLink(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const config = readConfig();
  if (!config) throw new Error('Square is not configured');

  const client = getClient(config);

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey: input.idempotencyKey,
    order: {
      locationId: config.locationId,
      lineItems: input.lineItems.map((li) => ({
        name: li.name,
        quantity: String(li.quantity),
        basePriceMoney: {
          amount: BigInt(li.unitPriceCents),
          currency: 'USD',
        },
        note: li.note,
      })),
      referenceId: input.orderId,
    },
    checkoutOptions: {
      redirectUrl: input.redirectUrl,
      askForShippingAddress: false,
    },
    prePopulatedData: input.buyerEmail
      ? {
          buyerEmail: input.buyerEmail,
          buyerPhoneNumber: input.buyerPhone,
        }
      : undefined,
  });

  const link = response.paymentLink;
  if (!link?.url || !link.id) {
    throw new Error('Square did not return a payment link');
  }

  return {
    url: link.url,
    checkoutId: link.id,
    squareOrderId: link.orderId ?? null,
  };
}

/**
 * Verify a Square webhook signature using HMAC-SHA256.
 * Per Square docs: HMAC of `${notificationUrl}${rawBody}` using the webhook signature key,
 * base64-encoded, compared against the `x-square-hmacsha256-signature` header.
 */
export function verifyWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string;
  notificationUrl: string;
}): boolean {
  const config = readConfig();
  if (!config) return false;

  const expected = createHmac('sha256', config.webhookSignatureKey)
    .update(args.notificationUrl + args.rawBody)
    .digest('base64');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(args.signatureHeader, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
