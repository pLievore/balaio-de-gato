import 'server-only';

import type {
  ProductByHandleQuery,
  ProductByHandleQueryVariables,
  ProductsQuery,
  ProductsQueryVariables,
  RelatedProductsQuery,
  RelatedProductsQueryVariables,
  SearchProductsQuery,
  SearchProductsQueryVariables,
} from '../types/storefront.generated';
import { shopifyStorefrontRequest } from '../client';
import { shopifyCacheTags, shopifyProductCacheTag } from '../constants';

export const PRODUCTS_QUERY = `#graphql
  query Products(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: ProductSortKeys = CREATED_AT
    $reverse: Boolean = true
    $query: String
  ) {
    products(
      first: $first
      last: $last
      after: $after
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      nodes {
        id
        handle
        title
        description
        productType
        vendor
        tags
        availableForSale
        updatedAt
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
        options {
          id
          name
          values
        }
        variants(first: 100) {
          nodes {
            id
            title
            sku
            availableForSale
            currentlyNotInStock
            quantityAvailable
            selectedOptions {
              name
              value
            }
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
    }
  }
` as const;

export const SEARCH_PRODUCTS_QUERY = `#graphql
  query SearchProducts(
    $query: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: SearchSortKeys = RELEVANCE
    $reverse: Boolean = false
    $productFilters: [ProductFilter!]
  ) {
    search(
      query: $query
      first: $first
      last: $last
      after: $after
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      types: [PRODUCT]
      prefix: LAST
      unavailableProducts: SHOW
      productFilters: $productFilters
    ) {
      nodes {
        __typename
        ... on Product {
          id
          handle
          title
          description
          productType
          vendor
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
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
    }
  }
` as const;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      productType
      vendor
      tags
      availableForSale
      updatedAt
      # Hand-maintained attributes (see src/lib/catalog/attributes). They are
      # only readable here because their definitions grant storefront access.
      metafields(
        identifiers: [
          { namespace: "custom", key: "dimensions" }
          { namespace: "custom", key: "color" }
          { namespace: "custom", key: "material" }
          { namespace: "custom", key: "features" }
        ]
      ) {
        key
        value
      }
      seo {
        title
        description
      }
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
      options {
        id
        name
        values
      }
      media(first: 100) {
        nodes {
          id
          alt
          mediaContentType
          previewImage {
            url
            altText
            width
            height
          }
          ... on MediaImage {
            image {
              url
              altText
              width
              height
            }
          }
          ... on Video {
            sources {
              url
              mimeType
              format
              width
              height
            }
          }
          ... on ExternalVideo {
            embedUrl
            host
            originUrl
          }
        }
      }
      variants(first: 100) {
        nodes {
          id
          title
          sku
          availableForSale
          currentlyNotInStock
          quantityAvailable
          selectedOptions {
            name
            value
          }
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
  }
` as const;

export const RELATED_PRODUCTS_QUERY = `#graphql
  query RelatedProducts($productId: ID!) {
    productRecommendations(productId: $productId, intent: RELATED) {
      id
      handle
      title
      description
      productType
      vendor
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
  }
` as const;

export async function getProducts(variables: ProductsQueryVariables = { first: 20 }) {
  const result = await shopifyStorefrontRequest<ProductsQuery, ProductsQueryVariables>(
    PRODUCTS_QUERY,
    {
      operationName: 'Products',
      variables,
      next: {
        revalidate: 300,
        tags: [shopifyCacheTags.all, shopifyCacheTags.products],
      },
    },
  );

  return result.data.products;
}

export async function getProductByHandle(handle: string) {
  const variables: ProductByHandleQueryVariables = { handle };
  const result = await shopifyStorefrontRequest<
    ProductByHandleQuery,
    ProductByHandleQueryVariables
  >(PRODUCT_BY_HANDLE_QUERY, {
    operationName: 'ProductByHandle',
    variables,
    next: {
      revalidate: 300,
      tags: [shopifyCacheTags.all, shopifyCacheTags.products, shopifyProductCacheTag(handle)],
    },
  });

  return result.data.product;
}

export async function getRelatedProducts(productId: string, limit = 4) {
  const variables: RelatedProductsQueryVariables = { productId };
  const result = await shopifyStorefrontRequest<
    RelatedProductsQuery,
    RelatedProductsQueryVariables
  >(RELATED_PRODUCTS_QUERY, {
    operationName: 'RelatedProducts',
    variables,
    next: {
      revalidate: 300,
      tags: [shopifyCacheTags.all, shopifyCacheTags.products],
    },
  });

  return (result.data.productRecommendations ?? []).slice(0, Math.max(0, limit));
}

export async function searchProducts(variables: SearchProductsQueryVariables) {
  const result = await shopifyStorefrontRequest<SearchProductsQuery, SearchProductsQueryVariables>(
    SEARCH_PRODUCTS_QUERY,
    {
      operationName: 'SearchProducts',
      variables,
      next: {
        revalidate: 300,
        tags: [shopifyCacheTags.all, shopifyCacheTags.products],
      },
    },
  );

  return result.data.search;
}
