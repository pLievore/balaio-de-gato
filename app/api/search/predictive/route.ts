import { NextResponse } from 'next/server';

import { normalizeCatalogSearch } from '../../../../src/lib/catalog/filters';
import {
  EMPTY_SUGGESTIONS,
  SUGGESTION_MIN_CHARS,
  type SearchSuggestions,
} from '../../../../src/lib/catalog/suggestions';
import { getPredictiveSearch } from '../../../../src/lib/shopify/queries/search';
import { validCompareAtPrice } from '../../../../src/lib/shopify/adapters/products';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = normalizeCatalogSearch(searchParams.get('q') ?? undefined);

  if (term.length < SUGGESTION_MIN_CHARS) {
    return json(EMPTY_SUGGESTIONS);
  }

  try {
    const result = await getPredictiveSearch(term);

    if (!result) {
      return json(EMPTY_SUGGESTIONS);
    }

    return json({
      queries: result.queries.map((suggestion) => suggestion.text).slice(0, 3),
      collections: result.collections.map((collection) => ({
        handle: collection.handle,
        title: collection.title,
      })),
      products: result.products.map((product) => {
        const price = {
          amount: product.priceRange.minVariantPrice.amount,
          currencyCode: product.priceRange.minVariantPrice.currencyCode,
        };

        return {
          handle: product.handle,
          title: product.title,
          availableForSale: product.availableForSale,
          price,
          compareAtPrice: validCompareAtPrice(price, product.compareAtPriceRange.minVariantPrice),
          image: product.featuredImage
            ? {
                url: product.featuredImage.url,
                alt: product.featuredImage.altText ?? null,
                width: product.featuredImage.width ?? null,
                height: product.featuredImage.height ?? null,
              }
            : null,
        };
      }),
    });
  } catch {
    // The Shopify client already logged the failure with safe details.
    // Suggestions are an enhancement: degrade to none instead of erroring.
    return json(EMPTY_SUGGESTIONS, 'no-store');
  }
}

function json(
  body: SearchSuggestions,
  cacheControl = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
) {
  return NextResponse.json(body, {
    headers: { 'Cache-Control': cacheControl },
  });
}
