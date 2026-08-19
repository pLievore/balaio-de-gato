import 'server-only';

import { isIP } from 'node:net';

import { createStorefrontApiClient } from '@shopify/storefront-api-client';

import { SHOPIFY_DEFAULT_REVALIDATE_SECONDS, SHOPIFY_DEFAULT_TIMEOUT_MS } from './constants';
import { getShopifyConfig } from './config';
import { normalizeGraphQLErrors, ShopifyStorefrontError } from './errors';

type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

type ShopifyRequestOptions<TVariables extends object> = {
  operationName: string;
  variables?: TVariables;
  buyerIp?: string;
  cache?: RequestCache;
  next?: NextFetchOptions;
  timeoutMs?: number;
  retries?: 0 | 1 | 2 | 3;
};

export type ShopifyRequestResult<TData> = {
  data: TData;
  graphQLErrors: string[];
  extensions?: Record<string, unknown>;
};

function writeSafeLog(level: 'error' | 'warn', details: Record<string, unknown>) {
  const log = level === 'error' ? console.error : console.warn;
  log('[shopify-storefront]', details);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export async function shopifyStorefrontRequest<
  TData,
  TVariables extends object = Record<string, never>,
>(
  document: string,
  options: ShopifyRequestOptions<TVariables>,
): Promise<ShopifyRequestResult<TData>> {
  const config = getShopifyConfig();
  const hasBuyerIp = Boolean(options.buyerIp && isIP(options.buyerIp));
  const cache = hasBuyerIp ? 'no-store' : (options.cache ?? 'force-cache');
  const next =
    cache === 'no-store'
      ? undefined
      : {
          revalidate: options.next?.revalidate ?? SHOPIFY_DEFAULT_REVALIDATE_SECONDS,
          tags: [...new Set(options.next?.tags ?? [])],
        };

  const client = createStorefrontApiClient({
    storeDomain: config.storeDomain,
    apiVersion: config.apiVersion,
    privateAccessToken: config.privateAccessToken,
    clientName: '801-outlet-nextjs',
    retries: options.retries ?? 2,
    customFetchApi: (url, init) =>
      fetch(url, {
        ...init,
        cache,
        next,
      }),
  });

  const headers: Record<string, string> = {};
  if (hasBuyerIp && options.buyerIp) {
    headers['Shopify-Storefront-Buyer-IP'] = options.buyerIp;
  }

  try {
    const response = await client.request<TData>(document, {
      variables: options.variables,
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? SHOPIFY_DEFAULT_TIMEOUT_MS),
    });

    const graphQLErrors = normalizeGraphQLErrors(response.errors?.graphQLErrors);
    const statusCode = response.errors?.networkStatusCode;

    if (response.data == null) {
      const error = new ShopifyStorefrontError({
        code: graphQLErrors.length > 0 ? 'GRAPHQL_ERROR' : 'EMPTY_RESPONSE',
        operationName: options.operationName,
        message: 'Shopify did not return usable data.',
        statusCode,
        graphQLErrors,
        retryable: statusCode === 429 || statusCode === 503,
      });
      writeSafeLog('error', error.toJSON());
      throw error;
    }

    if (graphQLErrors.length > 0) {
      writeSafeLog('warn', {
        code: 'GRAPHQL_ERROR',
        operationName: options.operationName,
        statusCode,
        graphQLErrorCount: graphQLErrors.length,
        hasPartialData: true,
      });
    }

    return {
      data: response.data,
      graphQLErrors,
      extensions: response.extensions,
    };
  } catch (error) {
    if (error instanceof ShopifyStorefrontError) throw error;

    const wrapped = new ShopifyStorefrontError({
      code: isAbortError(error) ? 'REQUEST_TIMEOUT' : 'REQUEST_FAILED',
      operationName: options.operationName,
      message: isAbortError(error)
        ? 'Shopify Storefront API request timed out.'
        : 'Shopify Storefront API request failed.',
      retryable: true,
      cause: error,
    });
    writeSafeLog('error', wrapped.toJSON());
    throw wrapped;
  }
}
