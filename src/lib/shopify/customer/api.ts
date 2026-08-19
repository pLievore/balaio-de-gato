import 'server-only';

import { getCustomerAccountConfig } from './config';

export class CustomerApiError extends Error {
  readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'CustomerApiError';
    this.statusCode = statusCode;
  }
}

export async function customerAccountRequest<TData>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const config = getCustomerAccountConfig();

  const response = await fetch(config.graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error('[customer-api] request failed', {
      status: response.status,
    });
    throw new CustomerApiError('Customer Account API request failed', response.status);
  }

  const payload = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };

  if (!payload.data) {
    console.error('[customer-api] empty response', {
      errorCount: payload.errors?.length ?? 0,
    });
    throw new CustomerApiError('Customer Account API returned no data');
  }

  return payload.data;
}

export type CustomerProfile = {
  displayName: string;
  emailAddress: string | null;
};

export type CustomerOrderSummary = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: { amount: string; currencyCode: string };
};

const CUSTOMER_PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      displayName
      emailAddress {
        emailAddress
      }
    }
  }
`;

const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillments(first: 1) {
            nodes {
              status
            }
          }
          totalPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

type ProfileResponse = {
  customer: {
    displayName: string;
    emailAddress: { emailAddress: string | null } | null;
  };
};

type OrdersResponse = {
  customer: {
    orders: {
      nodes: Array<{
        id: string;
        name: string;
        processedAt: string;
        financialStatus: string | null;
        fulfillments: { nodes: Array<{ status: string | null }> };
        totalPrice: { amount: string; currencyCode: string };
      }>;
    };
  };
};

export type CustomerOrderDetail = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  totalPrice: { amount: string; currencyCode: string };
  subtotal: { amount: string; currencyCode: string } | null;
  totalShipping: { amount: string; currencyCode: string } | null;
  totalTax: { amount: string; currencyCode: string } | null;
  shippingAddressLines: string[];
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    price: { amount: string; currencyCode: string } | null;
    imageUrl: string | null;
    imageAlt: string | null;
  }>;
};

const CUSTOMER_ORDER_QUERY = /* GraphQL */ `
  query CustomerOrder($orderId: ID!) {
    order(id: $orderId) {
      id
      name
      processedAt
      financialStatus
      totalPrice {
        amount
        currencyCode
      }
      subtotal {
        amount
        currencyCode
      }
      totalShipping {
        amount
        currencyCode
      }
      totalTax {
        amount
        currencyCode
      }
      shippingAddress {
        formatted
      }
      lineItems(first: 50) {
        nodes {
          id
          name
          quantity
          price {
            amount
            currencyCode
          }
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

type OrderDetailResponse = {
  order: {
    id: string;
    name: string;
    processedAt: string;
    financialStatus: string | null;
    totalPrice: { amount: string; currencyCode: string };
    subtotal: { amount: string; currencyCode: string } | null;
    totalShipping: { amount: string; currencyCode: string } | null;
    totalTax: { amount: string; currencyCode: string } | null;
    shippingAddress: { formatted: string[] } | null;
    lineItems: {
      nodes: Array<{
        id: string;
        name: string;
        quantity: number;
        price: { amount: string; currencyCode: string } | null;
        image: { url: string; altText: string | null } | null;
      }>;
    };
  } | null;
};

export async function getCustomerOrder(
  accessToken: string,
  orderId: string,
): Promise<CustomerOrderDetail | null> {
  const data = await customerAccountRequest<OrderDetailResponse>(
    accessToken,
    CUSTOMER_ORDER_QUERY,
    { orderId },
  );

  const order = data.order;
  if (!order) return null;

  return {
    id: order.id,
    name: order.name,
    processedAt: order.processedAt,
    financialStatus: order.financialStatus,
    totalPrice: order.totalPrice,
    subtotal: order.subtotal,
    totalShipping: order.totalShipping,
    totalTax: order.totalTax,
    shippingAddressLines: order.shippingAddress?.formatted ?? [],
    lineItems: order.lineItems.nodes.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      imageUrl: item.image?.url ?? null,
      imageAlt: item.image?.altText ?? null,
    })),
  };
}

export async function getCustomerProfile(accessToken: string): Promise<CustomerProfile> {
  const data = await customerAccountRequest<ProfileResponse>(accessToken, CUSTOMER_PROFILE_QUERY);

  return {
    displayName: data.customer.displayName,
    emailAddress: data.customer.emailAddress?.emailAddress ?? null,
  };
}

export async function getCustomerOrders(
  accessToken: string,
  first = 10,
): Promise<CustomerOrderSummary[]> {
  const data = await customerAccountRequest<OrdersResponse>(accessToken, CUSTOMER_ORDERS_QUERY, {
    first,
  });

  return data.customer.orders.nodes.map((order) => ({
    id: order.id,
    name: order.name,
    processedAt: order.processedAt,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillments.nodes[0]?.status ?? 'UNFULFILLED',
    totalPrice: order.totalPrice,
  }));
}
