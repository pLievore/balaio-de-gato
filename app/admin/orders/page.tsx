import type { Metadata } from 'next';
import Image from 'next/image';
import { ExternalLink, Info } from 'lucide-react';

import { listRecentPanelOrders } from '../../../src/lib/panel/orders';
import { PageHeader, Panel } from '../_components/ui';

export const metadata: Metadata = { title: 'Orders — 801 Outlet Panel' };
export const dynamic = 'force-dynamic';

const SHOPIFY_ORDERS_URL = 'https://admin.shopify.com/store/xwn9c1-m8/orders';

const FINANCIAL_PILL: Record<string, string> = {
  PAID: 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
  PENDING: 'bg-amber-50 text-amber-700',
  REFUNDED: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]',
  PARTIALLY_REFUNDED: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]',
};

function StatusChip({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
        FINANCIAL_PILL[value] ?? 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]'
      }`}
    >
      {value.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

export default async function PanelOrdersPage() {
  const orders = await listRecentPanelOrders();
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="OPERATION"
        title="Recent"
        titleAccent="orders"
        subtitle="Everything from the last 60 days, newest first."
        actions={
          <a
            href={SHOPIFY_ORDERS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
          >
            Open in Shopify
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        }
      />

      {orders.length === 0 ? (
        <Panel title="No orders yet">
          <p className="text-sm text-[rgb(var(--muted))]">
            Orders placed through the store will appear here.
          </p>
        </Panel>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const currency = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: order.currencyCode,
            });
            return (
              <div
                key={order.id}
                className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold">{order.name}</p>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    {dateFormat.format(new Date(order.createdAt))} (MT)
                  </p>
                  {order.cancelled ? (
                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-red-700 uppercase">
                      cancelled
                    </span>
                  ) : (
                    <>
                      <StatusChip value={order.financialStatus} />
                      <StatusChip value={order.fulfillmentStatus} />
                    </>
                  )}
                  <p className="ml-auto text-sm font-bold tabular-nums">
                    {currency.format(order.totalAmount)}
                  </p>
                  <a
                    href={`${SHOPIFY_ORDERS_URL}/${order.numericId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-xs font-semibold transition hover:border-[rgb(var(--fg))]"
                  >
                    Details
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </div>

                <ul className="mt-4 space-y-2">
                  {order.lines.map((line, index) => (
                    <li key={`${order.id}-${index}`} className="flex items-center gap-3 text-sm">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
                        {line.imageUrl ? (
                          <Image
                            src={line.imageUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{line.title}</span>
                      <span className="text-xs text-[rgb(var(--muted))]">× {line.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-[rgb(var(--muted))]">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Customer names and delivery addresses are protected customer data in Shopify and stay there
        — the Details button opens the full order, including the shipping address.
      </p>
    </div>
  );
}
