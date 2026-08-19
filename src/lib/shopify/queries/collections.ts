import 'server-only';

import type {
  CollectionByHandleQuery,
  CollectionByHandleQueryVariables,
  CollectionsQuery,
  CollectionsQueryVariables,
} from '../types/storefront.generated';
import { shopifyStorefrontRequest } from '../client';
import { shopifyCacheTags, shopifyCollectionCacheTag } from '../constants';

export const COLLECTIONS_QUERY = `#graphql
  query Collections(
    $first: Int!
    $after: String
    $sortKey: CollectionSortKeys = TITLE
    $reverse: Boolean = false
    $query: String
  ) {
    collections(
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      nodes {
        id
        handle
        title
        description
        updatedAt
        image {
          url
          altText
          width
          height
        }
        seo {
          title
          description
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
` as const;

export const COLLECTION_BY_HANDLE_QUERY = `#graphql
  query CollectionByHandle(
    $handle: String!
    $first: Int!
    $after: String
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      updatedAt
      image {
        url
        altText
        width
        height
      }
      seo {
        title
        description
      }
      products(first: $first, after: $after) {
        nodes {
          id
          handle
          title
          productType
          vendor
          tags
          availableForSale
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
` as const;

export async function getCollections(variables: CollectionsQueryVariables = { first: 20 }) {
  const result = await shopifyStorefrontRequest<CollectionsQuery, CollectionsQueryVariables>(
    COLLECTIONS_QUERY,
    {
      operationName: 'Collections',
      variables,
      next: {
        revalidate: 600,
        tags: [shopifyCacheTags.all, shopifyCacheTags.collections],
      },
    },
  );

  return result.data.collections;
}

export async function getCollectionByHandle(variables: CollectionByHandleQueryVariables) {
  const result = await shopifyStorefrontRequest<
    CollectionByHandleQuery,
    CollectionByHandleQueryVariables
  >(COLLECTION_BY_HANDLE_QUERY, {
    operationName: 'CollectionByHandle',
    variables,
    next: {
      revalidate: 300,
      tags: [
        shopifyCacheTags.all,
        shopifyCacheTags.collections,
        shopifyCacheTags.products,
        shopifyCollectionCacheTag(variables.handle),
      ],
    },
  });

  return result.data.collection;
}
