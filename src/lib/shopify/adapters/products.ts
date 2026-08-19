import type {
  CollectionByHandleQuery,
  ProductByHandleQuery,
  ProductsQuery,
  RelatedProductsQuery,
  SearchProductsQuery,
} from '../types/storefront.generated';
import { PRODUCT_ATTRIBUTES } from '../../catalog/attributes';
import type {
  CatalogImage,
  CatalogMoney,
  CatalogProductCard,
  CatalogProductDetail,
  ProductAttributeValues,
} from '../../catalog/types';

type CollectionProduct = NonNullable<
  CollectionByHandleQuery['collection']
>['products']['nodes'][number];

type ProductListItem = ProductsQuery['products']['nodes'][number];

type RelatedProduct = NonNullable<RelatedProductsQuery['productRecommendations']>[number];

export type SearchProduct = Extract<
  SearchProductsQuery['search']['nodes'][number],
  { __typename: 'Product' }
>;

type ProductSummary = CollectionProduct | ProductListItem | RelatedProduct | SearchProduct;
type ProductDetail = NonNullable<ProductByHandleQuery['product']>;

function toMoney(money: CatalogMoney): CatalogMoney {
  return {
    amount: money.amount,
    currencyCode: money.currencyCode,
  };
}

function toImage(
  image:
    | {
        url: string;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | null
    | undefined,
): CatalogImage | null {
  if (!image) return null;

  return {
    url: image.url,
    alt: image.altText ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

export function validCompareAtPrice(
  price: CatalogMoney,
  compareAtPrice: CatalogMoney | null | undefined,
): CatalogMoney | null {
  if (!compareAtPrice) return null;
  if (price.currencyCode !== compareAtPrice.currencyCode) return null;
  if (Number(compareAtPrice.amount) <= Number(price.amount)) return null;
  return toMoney(compareAtPrice);
}

function summaryDescription(product: ProductSummary): string | null {
  return 'description' in product ? product.description || null : null;
}

export function adaptProductCard(product: ProductSummary): CatalogProductCard {
  const price = toMoney(product.priceRange.minVariantPrice);
  const image = toImage(product.featuredImage);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: summaryDescription(product),
    availableForSale: product.availableForSale,
    tags: 'tags' in product ? product.tags : [],
    price,
    compareAtPrice: validCompareAtPrice(price, product.compareAtPriceRange.minVariantPrice),
    images: image ? [image] : [],
  };
}

function productImages(product: ProductDetail): CatalogImage[] {
  const candidates = product.media.nodes.flatMap((media) => {
    if ('image' in media) {
      const image = toImage(media.image);
      return image ? [image] : [];
    }

    return [];
  });

  const featured = toImage(product.featuredImage);
  if (featured) candidates.unshift(featured);

  const unique = new Map<string, CatalogImage>();
  for (const image of candidates) unique.set(image.url, image);
  return [...unique.values()];
}

/**
 * Metafields come back as a sparse list — one entry per requested identifier,
 * null where the product has no value — so unknown keys are simply skipped.
 */
function adaptAttributes(product: ProductDetail): ProductAttributeValues {
  const attributes: ProductAttributeValues = {};

  for (const metafield of product.metafields ?? []) {
    if (!metafield?.value) continue;
    const known = PRODUCT_ATTRIBUTES.find((spec) => spec.key === metafield.key);
    if (known) attributes[known.key] = metafield.value;
  }

  return attributes;
}

export function adaptProductDetail(product: ProductDetail): CatalogProductDetail {
  const card = adaptProductCard(product);

  return {
    ...card,
    description: product.description || null,
    images: productImages(product),
    vendor: product.vendor,
    productType: product.productType,
    tags: product.tags,
    attributes: adaptAttributes(product),
    seo: {
      title: product.seo.title || null,
      description: product.seo.description || null,
    },
    options: product.options.map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values,
    })),
    variants: product.variants.nodes.map((variant) => {
      const price = toMoney(variant.price);

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku || null,
        availableForSale: variant.availableForSale,
        currentlyNotInStock: variant.currentlyNotInStock,
        quantityAvailable: variant.quantityAvailable ?? null,
        price,
        compareAtPrice: validCompareAtPrice(price, variant.compareAtPrice),
        selectedOptions: variant.selectedOptions.map((option) => ({
          name: option.name,
          value: option.value,
        })),
        image: toImage(variant.image),
      };
    }),
  };
}
