import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  revalidationTagsFor,
  shopifyRevalidationSignalSchema,
  verifyRevalidationSecret,
} from '../../../../../src/lib/shopify/revalidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;

function bearerToken(header: string | null) {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}

export async function POST(request: Request) {
  const expectedSecret = process.env.SHOPIFY_REVALIDATION_SECRET;
  if (!expectedSecret || expectedSecret.length < 32) {
    console.error('[shopify-revalidation]', {
      event: 'configuration_error',
    });
    return NextResponse.json({ error: 'Revalidation is not configured.' }, { status: 503 });
  }

  const providedSecret = bearerToken(request.headers.get('authorization'));
  if (!verifyRevalidationSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = shopifyRevalidationSignalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid revalidation signal.' }, { status: 400 });
  }

  const tags = revalidationTagsFor(parsed.data);
  for (const tag of tags) revalidateTag(tag, 'max');

  console.info('[shopify-revalidation]', {
    event: 'accepted',
    topic: parsed.data.topic,
    hasHandle: Boolean(parsed.data.handle),
    hasWebhookId: Boolean(parsed.data.webhookId),
    tagCount: tags.length,
  });

  return NextResponse.json({ ok: true, revalidated: tags.length });
}
