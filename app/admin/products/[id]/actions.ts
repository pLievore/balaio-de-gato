'use server';

import { revalidatePath } from 'next/cache';

import { hasValidPanelSession } from '../../../../src/lib/panel/session';
import {
  appendProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  textToDescriptionHtml,
  updatePanelProductDetails,
} from '../../../../src/lib/panel/products';
import { AdminUserErrorsError } from '../../../../src/lib/shopify-admin/client';

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const MEDIA_GID = /^gid:\/\/shopify\/MediaImage\/\d+$/;
// Staged upload resource URLs always live on Shopify's storage.
const RESOURCE_URL_PATTERN = /^https:\/\/[a-z0-9.-]+\.(googleapis|shopifycloud)\.com\//;

type ActionResult = { ok: boolean; error?: string };

function errorMessage(error: unknown): string {
  if (error instanceof AdminUserErrorsError) {
    return error.userErrors.map((entry) => entry.message).join(' ');
  }
  return 'The update failed. Please try again.';
}

function revalidateProduct(productId: string) {
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId.split('/').pop()}`);
}

export async function saveDetailsAction(input: {
  productId: string;
  title: string;
  description: string;
}): Promise<ActionResult> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }
  if (!PRODUCT_GID.test(input.productId)) {
    return { ok: false, error: 'Invalid product.' };
  }
  const title = input.title.trim();
  if (title.length < 2 || title.length > 255) {
    return { ok: false, error: 'Enter a product title.' };
  }

  try {
    await updatePanelProductDetails({
      productId: input.productId,
      title,
      descriptionHtml: textToDescriptionHtml(input.description),
    });
    revalidateProduct(input.productId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function addMediaAction(input: {
  productId: string;
  resourceUrls: string[];
}): Promise<ActionResult> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }
  if (!PRODUCT_GID.test(input.productId)) {
    return { ok: false, error: 'Invalid product.' };
  }
  if (input.resourceUrls.length === 0 || input.resourceUrls.length > 12) {
    return { ok: false, error: 'Add between 1 and 12 photos at a time.' };
  }
  if (input.resourceUrls.some((url) => !RESOURCE_URL_PATTERN.test(url))) {
    return { ok: false, error: 'Invalid image reference.' };
  }

  try {
    await appendProductMedia(input.productId, input.resourceUrls);
    revalidateProduct(input.productId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function removeMediaAction(input: {
  productId: string;
  mediaId: string;
}): Promise<ActionResult> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }
  if (!PRODUCT_GID.test(input.productId) || !MEDIA_GID.test(input.mediaId)) {
    return { ok: false, error: 'Invalid photo reference.' };
  }

  try {
    await deleteProductMedia([input.mediaId]);
    revalidateProduct(input.productId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function reorderMediaAction(input: {
  productId: string;
  orderedMediaIds: string[];
}): Promise<ActionResult> {
  if (!(await hasValidPanelSession())) {
    return { ok: false, error: 'Session expired. Sign in again.' };
  }
  if (!PRODUCT_GID.test(input.productId)) {
    return { ok: false, error: 'Invalid product.' };
  }
  if (
    input.orderedMediaIds.length === 0 ||
    input.orderedMediaIds.length > 24 ||
    input.orderedMediaIds.some((id) => !MEDIA_GID.test(id))
  ) {
    return { ok: false, error: 'Invalid photo order.' };
  }

  try {
    await reorderProductMedia(input.productId, input.orderedMediaIds);
    revalidateProduct(input.productId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
