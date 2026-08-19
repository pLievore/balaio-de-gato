import { PRODUCT_ATTRIBUTES } from '../../../../src/lib/catalog/attributes';
import { hasValidPanelSession } from '../../../../src/lib/panel/session';
import { listPanelProducts } from '../../../../src/lib/panel/products';

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The spreadsheet the operation works in. Round-trips through the import at
 * `/admin/products/import`: every column here can be edited and sent back.
 *
 * A row with `variant_id` updates that variant. A row with an empty
 * `variant_id` creates a new product as a draft — see the import for the
 * matching rules.
 */
export async function GET() {
  if (!(await hasValidPanelSession())) {
    return new Response('Unauthorized', { status: 401 });
  }

  const products = await listPanelProducts();
  const header = [
    'variant_id',
    'product_title',
    'variant_title',
    'sku',
    'status',
    'price',
    'compare_at_price',
    'quantity',
    'description',
    ...PRODUCT_ATTRIBUTES.map((attribute) => attribute.key),
  ];

  const rows = products.flatMap((product) =>
    product.variants.map((variant) =>
      [
        variant.id,
        product.title,
        variant.title,
        variant.sku ?? '',
        product.status,
        variant.price,
        variant.compareAtPrice ?? '',
        variant.inventoryQuantity,
        product.description,
        ...PRODUCT_ATTRIBUTES.map((attribute) => product.attributes[attribute.key] ?? ''),
      ]
        .map(csvCell)
        .join(','),
    ),
  );

  // BOM so Excel opens the file as UTF-8 — without it, accented characters and
  // the inch marks in the dimensions come out mangled.
  const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="801-outlet-products-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
