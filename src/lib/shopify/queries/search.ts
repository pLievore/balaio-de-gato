import 'server-only';

import type {
  PredictiveSearchQuery,
  PredictiveSearchQueryVariables,
} from '../types/storefront.generated';
import { shopifyStorefrontRequest } from '../client';
import { shopifyCacheTags } from '../constants';

export const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch($query: String!, $limit: Int) {
    predictiveSearch(
      query: $query
      limit: $limit
      limitScope: EACH
      types: [PRODUCT, COLLECTION, QUERY]
      unavailableProducts: SHOW
    ) {
      queries {
        text
      }
      collections {
        id
        handle
        title
      }
      products {
        id
        handle
        title
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
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

export async function getPredictiveSearch(query: string, limit = 5) {
  const variables: PredictiveSearchQueryVariables = { query, limit };
  const result = await shopifyStorefrontRequest<
    PredictiveSearchQuery,
    PredictiveSearchQueryVariables
  >(PREDICTIVE_SEARCH_QUERY, {
    operationName: 'PredictiveSearch',
    variables,
    next: {
      revalidate: 60,
      tags: [shopifyCacheTags.all, shopifyCacheTags.products, shopifyCacheTags.collections],
    },
  });

  return result.data.predictiveSearch ?? null;
}
