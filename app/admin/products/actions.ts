'use server';

import { revalidatePath } from 'next/cache';

import { PRODUCT_ATTRIBUTES } from '../../../src/lib/catalog/attributes';
import { hasValidPanelSession } from '../../../src/lib/panel/session';
import {
  createPanelProduct,
  listPanelProducts,
  setInventoryQuantities,
  setProductAttributes,
  textToDescriptionHtml,
  updatePanelProductDetails,
  updateProductStatus,
  updateVariantPricing,
  type PanelProduct,
  type ProductAttributes,
} from '../../../src/lib/panel/products';
import { AdminUserErrorsError } from '../../../src/lib/shopify-admin/client';

export type PanelActionResult = { ok: boolean; error?: string };

function errorMessage(error: unknown): string {
  if (error instanceof AdminUserErrorsError) {
    return error.userErrors.map((entry) => entry.message).join(' ');
  }
  return 'The update failed. Please try again.';
}

async function guard(): Promise<boolean> {
  return hasValidPanelSession();
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;
const INVENTORY_GID = /^gid:\/\/shopify\/InventoryItem\/\d+$/;

export async function saveProductAction(input: {
  productId: string;
  status: PanelProduct['status'];
  variants: Array<{
    id: string;
    inventoryItemId: string;
    price: string;
    compareAtPrice: string;
    quantity: number;
    pricingChanged: boolean;
    quantityChanged: boolean;
  }>;
  statusChanged: boolean;
}): Promise<PanelActionResult> {
  if (!(await guard())) return { ok: false, error: 'Session expired. Sign in again.' };

  if (!PRODUCT_GID.test(input.productId)) return { ok: false, error: 'Invalid product.' };
  if (!['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(input.status)) {
    return { ok: false, error: 'Invalid status.' };
  }

  const pricing = input.variants.filter((variant) => variant.pricingChanged);
  const stock = input.variants.filter((variant) => variant.quantityChanged);

  for (const variant of pricing) {
    if (
      !VARIANT_GID.test(variant.id) ||
      !MONEY_PATTERN.test(variant.price) ||
      (variant.compareAtPrice !== '' && !MONEY_PATTERN.test(variant.compareAtPrice))
    ) {
      return { ok: false, error: 'Invalid price value.' };
    }
  }
  for (const variant of stock) {
    if (
      !INVENTORY_GID.test(variant.inventoryItemId) ||
      !Number.isInteger(variant.quantity) ||
      variant.quantity < 0 ||
      variant.quantity > 100000
    ) {
      return { ok: false, error: 'Invalid quantity value.' };
    }
  }

  try {
    if (input.statusChanged) {
      await updateProductStatus(input.productId, input.status);
    }
    if (pricing.length > 0) {
      await updateVariantPricing(
        input.productId,
        pricing.map((variant) => ({
          id: variant.id,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice === '' ? null : variant.compareAtPrice,
        })),
      );
    }
    if (stock.length > 0) {
      await setInventoryQuantities(
        stock.map((variant) => ({
          inventoryItemId: variant.inventoryItemId,
          quantity: variant.quantity,
        })),
      );
    }

    revalidatePath('/admin/products');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export type ImportRow = {
  /** Empty when the row describes a product that does not exist yet. */
  variantId: string;
  sku?: string;
  title?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  quantity?: number;
  attributes?: ProductAttributes;
};

export type ImportPreviewRow = {
  /** Stable identity for React, and for pairing preview rows with input rows. */
  key: string;
  label: string;
  action: 'update' | 'create' | 'none';
  changes: string[];
  valid: boolean;
  error?: string;
};

type Match = { product: PanelProduct; variant: PanelProduct['variants'][number] };

function buildIndex(products: PanelProduct[]) {
  const byVariant = new Map<string, Match>();
  const bySku = new Map<string, Match>();
  const byTitle = new Map<string, PanelProduct>();

  for (const product of products) {
    byTitle.set(product.title.trim().toLowerCase(), product);
    for (const variant of product.variants) {
      byVariant.set(variant.id, { product, variant });
      const sku = variant.sku?.trim().toLowerCase();
      if (sku) bySku.set(sku, { product, variant });
    }
  }

  return { byVariant, bySku, byTitle };
}

/**
 * Decides what a row refers to. `variant_id` is the strong key and comes from
 * the export; `sku` is the key the spreadsheet can carry on its own. A row with
 * neither — or with an sku the store has never seen — describes a new product.
 */
function resolveRow(row: ImportRow, index: ReturnType<typeof buildIndex>): Match | null {
  if (row.variantId) return index.byVariant.get(row.variantId) ?? null;

  const sku = row.sku?.trim().toLowerCase();
  if (sku) return index.bySku.get(sku) ?? null;

  return null;
}

function attributeChanges(
  current: ProductAttributes,
  incoming: ProductAttributes | undefined,
): string[] {
  if (!incoming) return [];
  const changes: string[] = [];

  for (const spec of PRODUCT_ATTRIBUTES) {
    const next = incoming[spec.key];
    if (next === undefined) continue;
    const before = current[spec.key] ?? '';
    if (next === before) continue;
    changes.push(next === '' ? `${spec.key} cleared` : `${spec.key} updated`);
  }

  return changes;
}

/** Rejects a row that cannot become a product, with the reason to show. */
function validateNewRow(
  row: ImportRow,
  title: string,
  index: ReturnType<typeof buildIndex>,
  seenTitles: Set<string>,
  seenSkus: Set<string>,
): string | null {
  if (row.variantId) return 'variant_id not found in the store.';
  if (!title) return 'New rows need a product_title.';
  if (!row.price || !MONEY_PATTERN.test(row.price)) {
    return 'New rows need a valid price.';
  }

  const titleKey = title.toLowerCase();
  if (index.byTitle.has(titleKey)) {
    return 'A product with this title already exists. Fill variant_id or sku to update it.';
  }
  if (seenTitles.has(titleKey)) {
    return 'The file repeats this title on more than one new row.';
  }

  const sku = row.sku?.trim().toLowerCase();
  if (sku && seenSkus.has(sku)) {
    return 'The file repeats this sku on more than one new row.';
  }
  if (
    row.quantity !== undefined &&
    (!Number.isInteger(row.quantity) || row.quantity < 0 || row.quantity > 100000)
  ) {
    return 'Invalid quantity.';
  }
  if (
    row.compareAtPrice !== undefined &&
    row.compareAtPrice !== '' &&
    !MONEY_PATTERN.test(row.compareAtPrice)
  ) {
    return 'Invalid compare-at price.';
  }

  return null;
}

export async function previewImportAction(
  rows: ImportRow[],
): Promise<{ ok: boolean; error?: string; preview?: ImportPreviewRow[] }> {
  if (!(await guard())) return { ok: false, error: 'Session expired. Sign in again.' };
  if (rows.length === 0 || rows.length > 500) {
    return { ok: false, error: 'The file must contain between 1 and 500 rows.' };
  }

  const products = await listPanelProducts();
  const index = buildIndex(products);

  // Guard against a file that would create the same product twice.
  const seenTitles = new Set<string>();
  const seenSkus = new Set<string>();

  const preview = rows.map((row, position): ImportPreviewRow => {
    const match = resolveRow(row, index);

    if (!match) {
      const key = `new:${position}`;
      const title = row.title?.trim() ?? '';
      const label = title || `Row ${position + 2}`;

      const error = validateNewRow(row, title, index, seenTitles, seenSkus);
      if (error) {
        return { key, label, action: 'none', changes: [], valid: false, error };
      }

      seenTitles.add(title.toLowerCase());
      const sku = row.sku?.trim().toLowerCase();
      if (sku) seenSkus.add(sku);

      const changes = [`create as draft at ${row.price}`];
      if (row.quantity !== undefined) changes.push(`stock ${row.quantity}`);
      const filled = PRODUCT_ATTRIBUTES.filter(
        (spec) => (row.attributes?.[spec.key] ?? '').trim() !== '',
      );
      if (filled.length > 0) changes.push(filled.map((spec) => spec.key).join(', '));

      return { key, label, action: 'create', changes, valid: true };
    }

    const { product, variant } = match;
    const key = variant.id;
    const label =
      variant.title === 'Default Title' ? product.title : `${product.title} / ${variant.title}`;
    const changes: string[] = [];

    if (row.price !== undefined && row.price !== variant.price) {
      if (!MONEY_PATTERN.test(row.price)) {
        return { key, label, action: 'none', changes, valid: false, error: 'Invalid price.' };
      }
      changes.push(`price ${variant.price} to ${row.price}`);
    }
    const currentCompare = variant.compareAtPrice ?? '';
    if (row.compareAtPrice !== undefined && row.compareAtPrice !== currentCompare) {
      if (row.compareAtPrice !== '' && !MONEY_PATTERN.test(row.compareAtPrice)) {
        return {
          key,
          label,
          action: 'none',
          changes,
          valid: false,
          error: 'Invalid compare-at price.',
        };
      }
      changes.push(`compare-at ${currentCompare || 'none'} to ${row.compareAtPrice || 'none'}`);
    }
    if (row.quantity !== undefined && row.quantity !== variant.inventoryQuantity) {
      if (!Number.isInteger(row.quantity) || row.quantity < 0 || row.quantity > 100000) {
        return { key, label, action: 'none', changes, valid: false, error: 'Invalid quantity.' };
      }
      changes.push(`stock ${variant.inventoryQuantity} to ${row.quantity}`);
    }

    const nextTitle = row.title?.trim();
    if (nextTitle && nextTitle !== product.title) changes.push('title updated');
    if (row.description !== undefined && row.description !== product.description) {
      changes.push('description updated');
    }
    changes.push(...attributeChanges(product.attributes, row.attributes));

    return {
      key,
      label,
      action: changes.length > 0 ? 'update' : 'none',
      changes,
      valid: true,
    };
  });

  return { ok: true, preview };
}

export async function applyImportAction(
  rows: ImportRow[],
): Promise<{ ok: boolean; error?: string; applied?: number }> {
  if (!(await guard())) return { ok: false, error: 'Session expired. Sign in again.' };

  const validation = await previewImportAction(rows);
  if (!validation.ok || !validation.preview) {
    return { ok: false, error: validation.error };
  }
  const preview = validation.preview;
  if (preview.some((row) => !row.valid)) {
    return { ok: false, error: 'Fix the invalid rows before applying.' };
  }

  const products = await listPanelProducts();
  const index = buildIndex(products);

  const pricingByProduct = new Map<
    string,
    Array<{ id: string; price: string; compareAtPrice: string | null }>
  >();
  const stockUpdates: Array<{ inventoryItemId: string; quantity: number }> = [];
  const detailUpdates: Array<{
    productId: string;
    title: string;
    description: string;
  }> = [];
  const attributeUpdates: Array<{
    productId: string;
    attributes: ProductAttributes;
  }> = [];
  const creations: ImportRow[] = [];
  let applied = 0;

  rows.forEach((row, position) => {
    const previewRow = preview[position];
    if (previewRow.action === 'none') return;

    if (previewRow.action === 'create') {
      creations.push(row);
      applied += 1;
      return;
    }

    const match = resolveRow(row, index);
    if (!match) return;
    const { product, variant } = match;

    const priceChanged = row.price !== undefined && row.price !== variant.price;
    const compareChanged =
      row.compareAtPrice !== undefined && row.compareAtPrice !== (variant.compareAtPrice ?? '');
    if (priceChanged || compareChanged) {
      const list = pricingByProduct.get(product.id) ?? [];
      list.push({
        id: variant.id,
        price: row.price ?? variant.price,
        compareAtPrice:
          row.compareAtPrice === undefined
            ? variant.compareAtPrice
            : row.compareAtPrice === ''
              ? null
              : row.compareAtPrice,
      });
      pricingByProduct.set(product.id, list);
      applied += 1;
    }
    if (row.quantity !== undefined && row.quantity !== variant.inventoryQuantity) {
      stockUpdates.push({
        inventoryItemId: variant.inventoryItemId,
        quantity: row.quantity,
      });
      applied += 1;
    }

    const nextTitle = row.title?.trim();
    const titleChanged = Boolean(nextTitle) && nextTitle !== product.title;
    const descriptionChanged =
      row.description !== undefined && row.description !== product.description;
    if (titleChanged || descriptionChanged) {
      detailUpdates.push({
        productId: product.id,
        title: nextTitle || product.title,
        description: row.description === undefined ? product.description : row.description,
      });
      applied += 1;
    }

    if (attributeChanges(product.attributes, row.attributes).length > 0) {
      attributeUpdates.push({
        productId: product.id,
        attributes: row.attributes ?? {},
      });
      applied += 1;
    }
  });

  try {
    for (const [productId, variants] of pricingByProduct) {
      await updateVariantPricing(productId, variants);
    }
    if (stockUpdates.length > 0) {
      await setInventoryQuantities(stockUpdates);
    }
    for (const update of detailUpdates) {
      await updatePanelProductDetails({
        productId: update.productId,
        title: update.title,
        descriptionHtml: textToDescriptionHtml(update.description),
      });
    }
    for (const update of attributeUpdates) {
      await setProductAttributes(update.productId, update.attributes);
    }

    // New products always land as drafts: they have no photos yet, and
    // publishing stays a deliberate step taken in the panel afterwards.
    for (const row of creations) {
      const { productId } = await createPanelProduct({
        title: (row.title ?? '').trim(),
        descriptionHtml: textToDescriptionHtml(row.description ?? ''),
        status: 'DRAFT',
        price: row.price ?? '0',
        compareAtPrice: row.compareAtPrice && row.compareAtPrice !== '' ? row.compareAtPrice : null,
        sku: row.sku?.trim() || null,
        quantity: row.quantity ?? 0,
        imageResourceUrls: [],
      });
      if (row.attributes) {
        await setProductAttributes(productId, row.attributes);
      }
    }

    revalidatePath('/admin/products');
    return { ok: true, applied };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
