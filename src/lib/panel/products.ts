import 'server-only';

import {
  ATTRIBUTE_NAMESPACE,
  PRODUCT_ATTRIBUTES,
  type ProductAttributeKey,
} from '../catalog/attributes';
import { adminGraphql, assertNoUserErrors } from '../shopify-admin/client';

/** Hand-maintained attributes, keyed as in `catalog/attributes`. */
export type ProductAttributes = Partial<Record<ProductAttributeKey, string>>;

export type PanelVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  inventoryItemId: string;
};

export type PanelProduct = {
  id: string;
  handle: string;
  title: string;
  /** Plain text, as Shopify stores alongside the HTML body. */
  description: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  imageUrl: string | null;
  attributes: ProductAttributes;
  variants: PanelVariant[];
};

type ProductsResponse = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      description: string | null;
      status: PanelProduct['status'];
      featuredImage: { url: string } | null;
      metafields: { nodes: Array<{ key: string; value: string }> };
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          sku: string | null;
          price: string;
          compareAtPrice: string | null;
          inventoryQuantity: number | null;
          inventoryItem: { id: string };
        }>;
      };
    }>;
  };
};

const PRODUCTS_PAGE_QUERY = `#graphql
  query PanelProducts($query: String, $after: String) {
    products(first: 100, query: $query, sortKey: TITLE, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        description
        status
        featuredImage { url }
        metafields(first: 10, namespace: "${ATTRIBUTE_NAMESPACE}") {
          nodes { key value }
        }
        variants(first: 50) {
          nodes {
            id
            title
            sku
            price
            compareAtPrice
            inventoryQuantity
            inventoryItem { id }
          }
        }
      }
    }
  }
`;

function adaptProduct(node: ProductsResponse['products']['nodes'][number]): PanelProduct {
  const attributes: ProductAttributes = {};
  for (const metafield of node.metafields?.nodes ?? []) {
    const known = PRODUCT_ATTRIBUTES.find((spec) => spec.key === metafield.key);
    if (known) attributes[known.key] = metafield.value;
  }

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description ?? '',
    status: node.status,
    imageUrl: node.featuredImage?.url ?? null,
    attributes,
    variants: node.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      inventoryQuantity: variant.inventoryQuantity ?? 0,
      inventoryItemId: variant.inventoryItem.id,
    })),
  };
}

export async function listPanelProducts(search?: string): Promise<PanelProduct[]> {
  const products: PanelProduct[] = [];
  let after: string | null = null;

  do {
    const data: ProductsResponse = await adminGraphql<ProductsResponse>(PRODUCTS_PAGE_QUERY, {
      query: search ? `title:*${search.replace(/["\\]/g, '')}*` : null,
      after,
    });
    products.push(...data.products.nodes.map(adaptProduct));
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after && products.length < 1000);

  return products;
}

export type LowStockEntry = {
  productId: string;
  title: string;
  variantTitle: string | null;
  imageUrl: string | null;
  quantity: number;
};

export type CatalogStats = {
  total: number;
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
  lowStock: LowStockEntry[];
};

export const LOW_STOCK_THRESHOLD = 2;

export function computeCatalogStats(products: PanelProduct[]): CatalogStats {
  const stats: CatalogStats = {
    total: products.length,
    active: 0,
    draft: 0,
    archived: 0,
    outOfStock: 0,
    lowStock: [],
  };

  for (const product of products) {
    if (product.status === 'ACTIVE') stats.active += 1;
    if (product.status === 'DRAFT') stats.draft += 1;
    if (product.status === 'ARCHIVED') stats.archived += 1;

    const totalQuantity = product.variants.reduce(
      (sum, variant) => sum + variant.inventoryQuantity,
      0,
    );
    if (product.status === 'ACTIVE' && totalQuantity <= 0) {
      stats.outOfStock += 1;
    }
    if (product.status !== 'ACTIVE') continue;
    for (const variant of product.variants) {
      if (variant.inventoryQuantity <= LOW_STOCK_THRESHOLD) {
        stats.lowStock.push({
          productId: product.id,
          title: product.title,
          variantTitle: variant.title === 'Default Title' ? null : variant.title,
          imageUrl: product.imageUrl,
          quantity: variant.inventoryQuantity,
        });
      }
    }
  }

  stats.lowStock.sort((a, b) => a.quantity - b.quantity);
  stats.lowStock = stats.lowStock.slice(0, 8);
  return stats;
}

export type PanelProductMedia = {
  /** MediaImage gid — also a File id, accepted by fileDelete. */
  id: string;
  imageUrl: string | null;
  alt: string | null;
};

export type PanelProductDetail = PanelProduct & {
  /** Plain-text description (Shopify strips the HTML). */
  descriptionText: string;
  media: PanelProductMedia[];
};

export async function getPanelProductDetail(numericId: string): Promise<PanelProductDetail | null> {
  if (!/^\d+$/.test(numericId)) return null;

  const data = await adminGraphql<{
    product: {
      id: string;
      title: string;
      handle: string;
      status: PanelProduct['status'];
      description: string;
      featuredImage: { url: string } | null;
      metafields: { nodes: Array<{ key: string; value: string }> };
      media: {
        nodes: Array<{
          id: string;
          alt: string | null;
          image?: { url: string } | null;
        }>;
      };
      variants: ProductsResponse['products']['nodes'][number]['variants'];
    } | null;
  }>(
    `#graphql
    query PanelProductDetail($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        status
        description
        featuredImage { url }
        metafields(first: 10, namespace: "${ATTRIBUTE_NAMESPACE}") {
          nodes { key value }
        }
        media(first: 24) {
          nodes {
            id
            alt
            ... on MediaImage { image { url } }
          }
        }
        variants(first: 50) {
          nodes {
            id
            title
            sku
            price
            compareAtPrice
            inventoryQuantity
            inventoryItem { id }
          }
        }
      }
    }
  `,
    { id: `gid://shopify/Product/${numericId}` },
  );

  const product = data.product;
  if (!product) return null;

  const attributes: ProductAttributes = {};
  for (const metafield of product.metafields?.nodes ?? []) {
    const known = PRODUCT_ATTRIBUTES.find((spec) => spec.key === metafield.key);
    if (known) attributes[known.key] = metafield.value;
  }

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    description: product.description,
    descriptionText: product.description,
    attributes,
    imageUrl: product.featuredImage?.url ?? null,
    media: product.media.nodes.map((node) => ({
      id: node.id,
      imageUrl: node.image?.url ?? null,
      alt: node.alt,
    })),
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      inventoryQuantity: variant.inventoryQuantity ?? 0,
      inventoryItemId: variant.inventoryItem.id,
    })),
  };
}

export async function updatePanelProductDetails(input: {
  productId: string;
  title: string;
  descriptionHtml: string;
}) {
  const data = await adminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductDetails($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id }
        userErrors { field message }
      }
    }
  `,
    {
      product: {
        id: input.productId,
        title: input.title,
        descriptionHtml: input.descriptionHtml,
      },
    },
  );
  assertNoUserErrors('productUpdate', data.productUpdate.userErrors);
}

/**
 * Writes the hand-maintained attributes. An empty string deletes the metafield
 * rather than storing a blank, so a cleared spreadsheet cell clears the value
 * on the product page too.
 */
export async function setProductAttributes(productId: string, attributes: ProductAttributes) {
  const toSet: Array<{
    ownerId: string;
    namespace: string;
    key: string;
    type: string;
    value: string;
  }> = [];
  const toDelete: Array<{ ownerId: string; namespace: string; key: string }> = [];

  for (const spec of PRODUCT_ATTRIBUTES) {
    const value = attributes[spec.key];
    if (value === undefined) continue;

    if (value.trim() === '') {
      toDelete.push({
        ownerId: productId,
        namespace: ATTRIBUTE_NAMESPACE,
        key: spec.key,
      });
    } else {
      toSet.push({
        ownerId: productId,
        namespace: ATTRIBUTE_NAMESPACE,
        key: spec.key,
        type: spec.type,
        value,
      });
    }
  }

  if (toSet.length > 0) {
    const data = await adminGraphql<{
      metafieldsSet: {
        userErrors: Array<{ field?: string[] | null; message: string }>;
      };
    }>(
      `#graphql
      mutation PanelSetAttributes($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `,
      { metafields: toSet },
    );
    assertNoUserErrors('metafieldsSet', data.metafieldsSet.userErrors);
  }

  if (toDelete.length > 0) {
    const data = await adminGraphql<{
      metafieldsDelete: {
        userErrors: Array<{ field?: string[] | null; message: string }>;
      };
    }>(
      `#graphql
      mutation PanelDeleteAttributes($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `,
      { metafields: toDelete },
    );
    assertNoUserErrors('metafieldsDelete', data.metafieldsDelete.userErrors);
  }
}

export async function appendProductMedia(productId: string, resourceUrls: string[]) {
  const data = await adminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductAppendMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
      productUpdate(product: $product, media: $media) {
        product { id }
        userErrors { field message }
      }
    }
  `,
    {
      product: { id: productId },
      media: resourceUrls.map((resourceUrl) => ({
        originalSource: resourceUrl,
        mediaContentType: 'IMAGE',
      })),
    },
  );
  assertNoUserErrors('productUpdate', data.productUpdate.userErrors);
}

export async function deleteProductMedia(mediaIds: string[]) {
  const data = await adminGraphql<{
    fileDelete: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductDeleteMedia($fileIds: [ID!]!) {
      fileDelete(fileIds: $fileIds) {
        userErrors { field message }
      }
    }
  `,
    { fileIds: mediaIds },
  );
  assertNoUserErrors('fileDelete', data.fileDelete.userErrors);
}

export async function reorderProductMedia(productId: string, orderedMediaIds: string[]) {
  const data = await adminGraphql<{
    productReorderMedia: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductReorderMedia($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        userErrors { field message }
      }
    }
  `,
    {
      id: productId,
      moves: orderedMediaIds.map((mediaId, index) => ({
        id: mediaId,
        newPosition: String(index),
      })),
    },
  );
  assertNoUserErrors('productReorderMedia', data.productReorderMedia.userErrors);
}

/** Converts operator-typed plain text into safe paragraph HTML. */
export function textToDescriptionHtml(text: string): string {
  const trimmed = text.trim().slice(0, 10000);
  if (!trimmed) return '';
  return trimmed
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

let cachedLocationId: string | null = null;

export async function getPrimaryLocationId(): Promise<string> {
  if (cachedLocationId) return cachedLocationId;
  const data = await adminGraphql<{
    locations: { nodes: Array<{ id: string }> };
  }>(`#graphql
    query PanelPrimaryLocation {
      locations(first: 1) {
        nodes { id }
      }
    }
  `);
  const id = data.locations.nodes[0]?.id;
  if (!id) throw new Error('No inventory location found');
  cachedLocationId = id;
  return id;
}

export type StagedUploadTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
};

/**
 * Uploads one image to Shopify's staged upload storage and returns the
 * resource URL to attach as product media. The file never touches disk and
 * is never exposed to the browser beyond the operator's own selection.
 */
export async function uploadImageToShopify(file: {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): Promise<string> {
  const data = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: StagedUploadTarget[] | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelStagedUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `,
    {
      input: [
        {
          filename: file.filename,
          mimeType: file.mimeType,
          resource: 'IMAGE',
          httpMethod: 'POST',
          fileSize: String(file.bytes.byteLength),
        },
      ],
    },
  );
  assertNoUserErrors('stagedUploadsCreate', data.stagedUploadsCreate.userErrors);

  const target = data.stagedUploadsCreate.stagedTargets?.[0];
  if (!target) throw new Error('Shopify did not return an upload target');

  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append('file', new Blob([file.bytes], { type: file.mimeType }), file.filename);

  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(`Image upload failed with status ${response.status}`);
  }

  return target.resourceUrl;
}

export async function createPanelProduct(input: {
  title: string;
  descriptionHtml: string;
  status: PanelProduct['status'];
  price: string;
  compareAtPrice: string | null;
  sku: string | null;
  quantity: number;
  imageResourceUrls: string[];
}): Promise<{ productId: string }> {
  const data = await adminGraphql<{
    productCreate: {
      product: {
        id: string;
        variants: {
          nodes: Array<{ id: string; inventoryItem: { id: string } }>;
        };
      } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          variants(first: 1) {
            nodes { id inventoryItem { id } }
          }
        }
        userErrors { field message }
      }
    }
  `,
    {
      product: {
        title: input.title,
        descriptionHtml: input.descriptionHtml,
        status: input.status,
      },
      media: input.imageResourceUrls.map((resourceUrl) => ({
        originalSource: resourceUrl,
        mediaContentType: 'IMAGE',
      })),
    },
  );
  assertNoUserErrors('productCreate', data.productCreate.userErrors);

  const product = data.productCreate.product;
  const variant = product?.variants.nodes[0];
  if (!product || !variant) {
    throw new Error('Product was not created');
  }

  const pricing = await adminGraphql<{
    productVariantsBulkUpdate: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelNewVariantSetup($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }
  `,
    {
      productId: product.id,
      variants: [
        {
          id: variant.id,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          inventoryItem: {
            tracked: true,
            ...(input.sku ? { sku: input.sku } : {}),
          },
        },
      ],
    },
  );
  assertNoUserErrors('productVariantsBulkUpdate', pricing.productVariantsBulkUpdate.userErrors);

  await setInventoryQuantities([
    { inventoryItemId: variant.inventoryItem.id, quantity: input.quantity },
  ]);

  return { productId: product.id };
}

export async function updateProductStatus(productId: string, status: PanelProduct['status']) {
  const data = await adminGraphql<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelProductStatus($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id }
        userErrors { field message }
      }
    }
  `,
    { product: { id: productId, status } },
  );
  assertNoUserErrors('productUpdate', data.productUpdate.userErrors);
}

export async function updateVariantPricing(
  productId: string,
  variants: Array<{ id: string; price: string; compareAtPrice: string | null }>,
) {
  const data = await adminGraphql<{
    productVariantsBulkUpdate: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelVariantPricing($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }
  `,
    { productId, variants },
  );
  assertNoUserErrors('productVariantsBulkUpdate', data.productVariantsBulkUpdate.userErrors);
}

async function getAvailableQuantities(
  inventoryItemIds: string[],
  locationId: string,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (let index = 0; index < inventoryItemIds.length; index += 100) {
    const chunk = inventoryItemIds.slice(index, index + 100);
    const data = await adminGraphql<{
      nodes: Array<{
        id: string;
        inventoryLevel: {
          quantities: Array<{ quantity: number }>;
        } | null;
      } | null>;
    }>(
      `#graphql
      query PanelAvailableQuantities($ids: [ID!]!, $locationId: ID!) {
        nodes(ids: $ids) {
          ... on InventoryItem {
            id
            inventoryLevel(locationId: $locationId) {
              quantities(names: ["available"]) { quantity }
            }
          }
        }
      }
    `,
      { ids: chunk, locationId },
    );
    for (const node of data.nodes) {
      if (node?.id) {
        result.set(node.id, node.inventoryLevel?.quantities[0]?.quantity ?? 0);
      }
    }
  }
  return result;
}

export async function setInventoryQuantities(
  quantities: Array<{ inventoryItemId: string; quantity: number }>,
) {
  const locationId = await getPrimaryLocationId();
  // 2026-07 requires changeFromQuantity (optimistic concurrency) on every
  // entry and an @idempotent key on the field.
  const current = await getAvailableQuantities(
    quantities.map((entry) => entry.inventoryItemId),
    locationId,
  );
  const idempotencyKey = crypto.randomUUID();
  const data = await adminGraphql<{
    inventorySetQuantities: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation PanelSetInventory($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) @idempotent(key: "${idempotencyKey}") {
        userErrors { field message }
      }
    }
  `,
    {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: quantities.map((entry) => ({
          inventoryItemId: entry.inventoryItemId,
          locationId,
          quantity: entry.quantity,
          changeFromQuantity: current.get(entry.inventoryItemId) ?? 0,
        })),
      },
    },
  );
  assertNoUserErrors('inventorySetQuantities', data.inventorySetQuantities.userErrors);
}
