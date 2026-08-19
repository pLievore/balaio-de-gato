import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { getSalesSummary, type SalesPeriodDays } from '../../../src/lib/panel/analytics';
import {
  CHART_PALETTE,
  financialStatusLabel,
  formatMoney,
  formatShortDay,
  STATUS_COLORS,
} from '../_components/format';
import { BiHero, DeltaChip, KpiCard, Panel, PageHeader } from '../_components/ui';
import { AreaTrend, Donut } from '../_components/charts';

export const metadata: Metadata = { title: 'Sales — 801 Outlet Panel' };

const PERIODS: Array<{ days: SalesPeriodDays; label: string }> = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 60, label: 'Last 60 days' },
];

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const days = (PERIODS.find((p) => String(p.days) === period)?.days ?? 30) as SalesPeriodDays;
  const summary = await getSalesSummary(days);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ANALYTICS"
        title="Sales"
        titleAccent="analysis"
        subtitle={`Live order data · times in ${summary.timezone}.`}
        actions={
          <nav
            className="flex max-w-full overflow-x-auto rounded-full border border-[rgb(var(--border))] bg-white p-1"
            aria-label="Period"
          >
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={`/admin/sales?period=${p.days}`}
                className={
                  p.days === days
                    ? 'shrink-0 rounded-full bg-[rgb(var(--fg))] px-4 py-1.5 text-xs font-bold text-white'
                    : 'shrink-0 rounded-full px-4 py-1.5 text-xs font-bold text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]'
                }
              >
                {p.label}
              </Link>
            ))}
          </nav>
        }
      />

      <BiHero
        eyebrow={`Revenue · last ${days} days`}
        value={formatMoney(summary.totalRevenue, summary.currencyCode)}
        side={
          <>
            <DeltaChip value={summary.revenueDelta} suffix={`vs previous ${days}d`} dark />
            <p className="text-xs text-white/50">
              {summary.orderCount} orders · {summary.unitsSold} units
            </p>
          </>
        }
      >
        {summary.totalRevenue === 0 ? (
          <p className="text-sm text-white/60">No sales recorded in this period.</p>
        ) : (
          <AreaTrend
            data={summary.daily.map((d) => ({
              date: d.date,
              value: d.revenue,
              hint: `${formatShortDay(d.date)} — ${formatMoney(d.revenue, summary.currencyCode)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`,
            }))}
            maxLabel={formatMoney(
              Math.max(...summary.daily.map((d) => d.revenue)),
              summary.currencyCode,
            )}
            tone="dark"
            height={150}
          />
        )}
      </BiHero>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          title="Orders"
          value={String(summary.orderCount)}
          sub={summary.ordersDelta === null ? undefined : `vs previous ${days}d`}
          spark={summary.daily.map((d) => d.orders)}
          href="/admin/orders"
        />
        <KpiCard
          title="Average order"
          value={formatMoney(summary.averageOrderValue, summary.currencyCode)}
          sub={`last ${days} days`}
        />
        <KpiCard title="Units sold" value={String(summary.unitsSold)} />
        <KpiCard
          title="Peak day"
          value={
            summary.totalRevenue === 0
              ? '—'
              : formatMoney(Math.max(...summary.daily.map((d) => d.revenue)), summary.currencyCode)
          }
          sub={
            summary.totalRevenue === 0
              ? undefined
              : formatShortDay(
                  summary.daily.reduce((best, d) => (d.revenue > best.revenue ? d : best)).date,
                )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Orders by payment status">
          <Donut
            segments={summary.byStatus.map((entry, index) => ({
              label: financialStatusLabel(entry.status),
              value: entry.count,
              color: STATUS_COLORS[entry.status] ?? CHART_PALETTE[index % CHART_PALETTE.length],
              hint: formatMoney(entry.revenue, summary.currencyCode),
            }))}
            centerLabel={{ value: String(summary.orderCount), label: 'orders' }}
            size={120}
          />
        </Panel>
        <Panel title="Best sellers" className="xl:col-span-2">
          {summary.bestSellers.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">Nothing sold in this period.</p>
          ) : (
            <ol className="space-y-3">
              {summary.bestSellers.map((item, index) => (
                <li key={item.productId ?? item.title} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-bold text-[rgb(var(--muted))]">
                    {index + 1}
                  </span>
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-[rgb(var(--muted))]">
                      {item.quantity} unit{item.quantity === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">
                    {formatMoney(item.revenue, summary.currencyCode)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Recent orders" className="xl:col-span-3">
          {summary.recentOrders.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">No orders in this period.</p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--border))]">
              {summary.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{order.name}</p>
                    <p className="text-xs text-[rgb(var(--muted))]">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: summary.timezone,
                      }).format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.financialStatus ? (
                      <span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--muted))] uppercase">
                        {financialStatusLabel(order.financialStatus)}
                      </span>
                    ) : null}
                    <p className="text-sm font-bold tabular-nums">
                      {formatMoney(order.total, summary.currencyCode)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-xs text-[rgb(var(--muted))]">
        Cancelled orders are excluded. Order data covers the trailing 60 days available to the
        panel&apos;s API access
        {days * 2 > 60
          ? '; period-over-period comparison is unavailable for the 60-day view for the same reason.'
          : '.'}
      </p>
    </div>
  );
}
