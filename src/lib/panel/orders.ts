import 'server-only';

import { adminGraphql } from '../shopify-admin/client';

// Customer name and address are Shopify protected customer data: reading
// them needs a Shopify approval the app does not have (and the panel does
// not need). The Shopify order page — one tap away — shows them.
export type PanelOrderLine = {
  title: string;
  quantity: number;
  imageUrl: string | null;
};

export type PanelOrder = {
  id: string;
  numericId: string;
  name: string;
  createdAt: string;
  cancelled: boolean;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalAmount: number;
  currencyCode: string;
  lines: PanelOrderLine[];
};

type OrdersListResponse = {
  orders: {
    nodes: Array<{
      id: string;
      name: string;
      createdAt: string;
      cancelledAt: string | null;
      displayFinancialStatus: string | null;
      displayFulfillmentStatus: string | null;
      currentTotalPriceSet: {
        shopMoney: { amount: string; currencyCode: string };
      };
      lineItems: {
        nodes: Array<{
          title: string;
          quantity: number;
          product: { featuredImage: { url: string } | null } | null;
        }>;
      };
    }>;
  };
};

const ORDERS_LIST_QUERY = `#graphql
  query PanelOrderList($query: String!) {
    orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        name
        createdAt
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: 10) {
          nodes {
            title
            quantity
            product { featuredImage { url } }
          }
        }
      }
    }
  }
`;

/** Most recent orders within the 60-day read_orders horizon. */
export async function listRecentPanelOrders(): Promise<PanelOrder[]> {
  const since = new Date(Date.now() - 59 * 86400000).toISOString().slice(0, 10);
  const data = await adminGraphql<OrdersListResponse>(ORDERS_LIST_QUERY, {
    query: `created_at:>=${since}`,
  });

  return data.orders.nodes.map((node) => ({
    id: node.id,
    numericId: node.id.split('/').pop() ?? '',
    name: node.name,
    createdAt: node.createdAt,
    cancelled: node.cancelledAt !== null,
    financialStatus: node.displayFinancialStatus,
    fulfillmentStatus: node.displayFulfillmentStatus,
    totalAmount: Number(node.currentTotalPriceSet.shopMoney.amount),
    currencyCode: node.currentTotalPriceSet.shopMoney.currencyCode,
    lines: node.lineItems.nodes.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      imageUrl: line.product?.featuredImage?.url ?? null,
    })),
  }));
}
