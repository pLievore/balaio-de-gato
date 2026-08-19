'use server';

import { revalidatePath } from 'next/cache';

import { hasValidPanelSession } from '../../../../src/lib/panel/session';
import {
  createPanelProduct,
  textToDescriptionHtml,
  uploadImageToShopify,
} from '../../../../src/lib/panel/products';
import { AdminUserErrorsError } from '../../../../src/lib/shopify-admin/client';

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Staged upload resource URLs always live on Shopify's storage.
const RESOURCE_URL_PATTERN = /^https:\/\/[a-z0-9.-]+\.(googleapis|shopifycloud)\.com\//;

function errorMessage(error: unknown): string {
  if (error instanceof AdminUserErrorsError) {
    return error.userErrors.map((entry) => entry.message).join(' ');
  }
  return 'The operation failed. Please try again.';
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; resourceUrl?: string }> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file received.' };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'Only JPEG, PNG or WebP images are allowed.' };
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Images must be smaller than 6 MB.' };
  }

  try {
    const resourceUrl = await uploadImageToShopify({
      filename: file.name.replace(/[^\w.-]/g, '_').slice(0, 100) || 'photo.jpg',
      mimeType: file.type,
      bytes: await file.arrayBuffer(),
    });
    return { ok: true, resourceUrl };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function createProductAction(input: {
  title: string;
  description: string;
  status: 'ACTIVE' | 'DRAFT';
  price: string;
  compareAtPrice: string;
  sku: string;
  quantity: number;
  imageResourceUrls: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }

  const title = input.title.trim();
  if (title.length < 2 || title.length > 255) {
    return { ok: false, error: 'Enter a product title.' };
  }
  if (!['ACTIVE', 'DRAFT'].includes(input.status)) {
    return { ok: false, error: 'Invalid status.' };
  }
  if (!MONEY_PATTERN.test(input.price)) {
    return { ok: false, error: 'Enter a valid price.' };
  }
  if (input.compareAtPrice !== '' && !MONEY_PATTERN.test(input.compareAtPrice)) {
    return { ok: false, error: 'Enter a valid compare-at price.' };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > 100000) {
    return { ok: false, error: 'Enter a valid stock quantity.' };
  }
  if (input.imageResourceUrls.length > 12) {
    return { ok: false, error: 'Use at most 12 photos.' };
  }
  if (input.imageResourceUrls.some((url) => !RESOURCE_URL_PATTERN.test(url))) {
    return { ok: false, error: 'Invalid image reference.' };
  }

  const descriptionHtml = textToDescriptionHtml(input.description);

  try {
    await createPanelProduct({
      title,
      descriptionHtml,
      status: input.status,
      price: input.price,
      compareAtPrice: input.compareAtPrice === '' ? null : input.compareAtPrice,
      sku: input.sku.trim().slice(0, 100) || null,
      quantity: input.quantity,
      imageResourceUrls: input.imageResourceUrls,
    });
    revalidatePath('/admin/products');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
