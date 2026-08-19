import assert from 'node:assert/strict';
import test from 'node:test';

import type { CollectionByHandleQuery, ProductByHandleQuery } from '../types/storefront.generated';
import { adaptProductCard, adaptProductDetail } from './products';

type CollectionProduct = NonNullable<
  CollectionByHandleQuery['collection']
>['products']['nodes'][number];
type ProductDetail = NonNullable<ProductByHandleQuery['product']>;

test('adapts a Shopify collection product without leaking GraphQL types', () => {
  const source = {
    id: 'gid://shopify/Product/1',
    handle: 'linen-sofa',
    title: 'Linen Sofa',
    productType: '',
    vendor: '801 Outlet',
    availableForSale: true,
    featuredImage: {
      url: 'https://cdn.shopify.com/sofa.jpg',
      altText: 'Linen sofa',
      width: 1200,
      height: 900,
    },
    priceRange: {
      minVariantPrice: { amount: '699.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '699.00', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '899.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '899.00', currencyCode: 'USD' },
    },
  } as CollectionProduct;

  assert.deepEqual(adaptProductCard(source), {
    id: 'gid://shopify/Product/1',
    handle: 'linen-sofa',
    title: 'Linen Sofa',
    description: null,
    availableForSale: true,
    tags: [],
    price: { amount: '699.00', currencyCode: 'USD' },
    compareAtPrice: { amount: '899.00', currencyCode: 'USD' },
    images: [
      {
        url: 'https://cdn.shopify.com/sofa.jpg',
        alt: 'Linen sofa',
        width: 1200,
        height: 900,
      },
    ],
  });
});

test('deduplicates product media and normalizes optional inventory', () => {
  const source = {
    id: 'gid://shopify/Product/1',
    handle: 'linen-sofa',
    title: 'Linen Sofa',
    description: 'A comfortable sofa.',
    descriptionHtml: '<p>A comfortable sofa.</p>',
    productType: 'Sofa',
    vendor: '801 Outlet',
    tags: [],
    availableForSale: true,
    updatedAt: '2026-07-15T00:00:00Z',
    seo: { title: '', description: '' },
    featuredImage: {
      url: 'https://cdn.shopify.com/sofa.jpg',
      altText: 'Linen sofa',
      width: 1200,
      height: 900,
    },
    priceRange: {
      minVariantPrice: { amount: '699.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '699.00', currencyCode: 'USD' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '0.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '0.00', currencyCode: 'USD' },
    },
    options: [{ id: 'option-1', name: 'Color', values: ['Sage'] }],
    media: {
      nodes: [
        {
          id: 'media-1',
          alt: 'Linen sofa',
          mediaContentType: 'IMAGE',
          previewImage: null,
          image: {
            url: 'https://cdn.shopify.com/sofa.jpg',
            altText: 'Linen sofa',
            width: 1200,
            height: 900,
          },
        },
      ],
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Sage',
          sku: 'SOFA-SAGE',
          availableForSale: true,
          currentlyNotInStock: false,
          quantityAvailable: undefined,
          selectedOptions: [{ name: 'Color', value: 'Sage' }],
          price: { amount: '699.00', currencyCode: 'USD' },
          compareAtPrice: null,
          image: null,
        },
      ],
    },
  } as unknown as ProductDetail;

  const result = adaptProductDetail(source);

  assert.equal(result.images.length, 1);
  assert.equal(result.compareAtPrice, null);
  assert.equal(result.variants[0]?.quantityAvailable, null);
  assert.deepEqual(result.options[0], {
    id: 'option-1',
    name: 'Color',
    values: ['Sage'],
  });
});
