import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { shopifyCacheTags, shopifyCollectionCacheTag, shopifyProductCacheTag } from './constants';

const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const shopifyRevalidationSignalSchema = z.object({
  topic: z.enum([
    'products/create',
    'products/update',
    'products/delete',
    'collections/create',
    'collections/update',
    'collections/delete',
    'inventory_levels/update',
  ]),
  handle: z.string().trim().max(255).regex(handlePattern).optional(),
  webhookId: z.string().trim().min(1).max(255).optional(),
});

export type ShopifyRevalidationSignal = z.infer<typeof shopifyRevalidationSignalSchema>;

export function verifyRevalidationSecret(
  provided: string | undefined,
  expected: string | undefined,
) {
  if (!provided || !expected || expected.length < 32) return false;

  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function revalidationTagsFor(signal: ShopifyRevalidationSignal) {
  const tags = new Set<string>([shopifyCacheTags.all]);

  if (signal.topic.startsWith('products/')) {
    tags.add(shopifyCacheTags.products);
    if (signal.handle) tags.add(shopifyProductCacheTag(signal.handle));
  } else if (signal.topic.startsWith('collections/')) {
    tags.add(shopifyCacheTags.collections);
    tags.add(shopifyCacheTags.products);
    if (signal.handle) {
      tags.add(shopifyCollectionCacheTag(signal.handle));
    }
  } else if (signal.topic === 'inventory_levels/update') {
    tags.add(shopifyCacheTags.products);
  }

  return [...tags];
}
