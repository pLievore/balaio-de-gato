import 'server-only';

import type {
  CartAddLinesMutation,
  CartAddLinesMutationVariables,
  CartBuyerIdentityUpdateMutation,
  CartBuyerIdentityUpdateMutationVariables,
  CartCreateMutation,
  CartCreateMutationVariables,
  CartQuery,
  CartQueryVariables,
  CartRemoveLinesMutation,
  CartRemoveLinesMutationVariables,
  CartUpdateLinesMutation,
  CartUpdateLinesMutationVariables,
} from '../types/storefront.generated';
import { shopifyStorefrontRequest } from '../client';

const CART_FRAGMENT = `#graphql
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    discountCodes {
      code
      applicable
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            quantityAvailable
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            image {
              url
              altText
              width
              height
            }
            product {
              handle
              title
            }
          }
        }
      }
    }
  }
` as const;

export const CART_QUERY = `#graphql
  query Cart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
  ${CART_FRAGMENT}
` as const;

export const CART_CREATE_MUTATION = `#graphql
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const CART_ADD_LINES_MUTATION = `#graphql
  mutation CartAddLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const CART_UPDATE_LINES_MUTATION = `#graphql
  mutation CartUpdateLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const CART_REMOVE_LINES_MUTATION = `#graphql
  mutation CartRemoveLines($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = `#graphql
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
  ) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

type CartUserError = { field?: string[] | null; message: string; code?: string | null };

export class CartUserErrorsError extends Error {
  readonly userErrors: CartUserError[];

  constructor(operation: string, userErrors: CartUserError[]) {
    super(`${operation} returned Shopify user errors`);
    this.name = 'CartUserErrorsError';
    this.userErrors = userErrors;
  }
}

function assertNoUserErrors(operation: string, userErrors: CartUserError[] | undefined) {
  if (userErrors && userErrors.length > 0) {
    throw new CartUserErrorsError(operation, userErrors);
  }
}

export async function fetchCart(cartId: string, buyerIp?: string) {
  const result = await shopifyStorefrontRequest<CartQuery, CartQueryVariables>(CART_QUERY, {
    operationName: 'Cart',
    variables: { cartId },
    cache: 'no-store',
    buyerIp,
  });

  return result.data.cart ?? null;
}

export async function createCart(
  lines: Array<{ merchandiseId: string; quantity: number }>,
  buyerIp?: string,
) {
  const result = await shopifyStorefrontRequest<CartCreateMutation, CartCreateMutationVariables>(
    CART_CREATE_MUTATION,
    {
      operationName: 'CartCreate',
      variables: { lines },
      cache: 'no-store',
      retries: 0,
      buyerIp,
    },
  );

  assertNoUserErrors('cartCreate', result.data.cartCreate?.userErrors);
  return result.data.cartCreate?.cart ?? null;
}

export async function addCartLines(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>,
  buyerIp?: string,
) {
  const result = await shopifyStorefrontRequest<
    CartAddLinesMutation,
    CartAddLinesMutationVariables
  >(CART_ADD_LINES_MUTATION, {
    operationName: 'CartAddLines',
    variables: { cartId, lines },
    cache: 'no-store',
    retries: 0,
    buyerIp,
  });

  assertNoUserErrors('cartLinesAdd', result.data.cartLinesAdd?.userErrors);
  return result.data.cartLinesAdd?.cart ?? null;
}

export async function updateCartLines(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>,
  buyerIp?: string,
) {
  const result = await shopifyStorefrontRequest<
    CartUpdateLinesMutation,
    CartUpdateLinesMutationVariables
  >(CART_UPDATE_LINES_MUTATION, {
    operationName: 'CartUpdateLines',
    variables: { cartId, lines },
    cache: 'no-store',
    retries: 0,
    buyerIp,
  });

  assertNoUserErrors('cartLinesUpdate', result.data.cartLinesUpdate?.userErrors);
  return result.data.cartLinesUpdate?.cart ?? null;
}

export async function updateCartBuyerIdentity(
  cartId: string,
  customerAccessToken: string,
  buyerIp?: string,
) {
  const result = await shopifyStorefrontRequest<
    CartBuyerIdentityUpdateMutation,
    CartBuyerIdentityUpdateMutationVariables
  >(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
    operationName: 'CartBuyerIdentityUpdate',
    variables: { cartId, buyerIdentity: { customerAccessToken } },
    cache: 'no-store',
    retries: 0,
    buyerIp,
  });

  assertNoUserErrors('cartBuyerIdentityUpdate', result.data.cartBuyerIdentityUpdate?.userErrors);
  return result.data.cartBuyerIdentityUpdate?.cart ?? null;
}

export async function removeCartLines(cartId: string, lineIds: string[], buyerIp?: string) {
  const result = await shopifyStorefrontRequest<
    CartRemoveLinesMutation,
    CartRemoveLinesMutationVariables
  >(CART_REMOVE_LINES_MUTATION, {
    operationName: 'CartRemoveLines',
    variables: { cartId, lineIds },
    cache: 'no-store',
    retries: 0,
    buyerIp,
  });

  assertNoUserErrors('cartLinesRemove', result.data.cartLinesRemove?.userErrors);
  return result.data.cartLinesRemove?.cart ?? null;
}
