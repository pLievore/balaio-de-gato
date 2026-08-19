import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  Download,
  FileUp,
  Filter,
  LineChart,
  Plus,
  ReceiptText,
  Store,
  type LucideIcon,
} from 'lucide-react';

import { getSalesSummary } from '../../src/lib/panel/analytics';
import {
  FUNNEL_STEPS,
  FUNNEL_STEP_LABEL,
  TRAFFIC_SOURCE_LABEL,
  getFunnelBreakdown,
  getFunnelCounts,
  isFunnelStorageConfigured,
  type BreakdownEntry,
  type FunnelDailyRow,
  type FunnelStep,
  type TrafficSource,
} from '../../src/lib/analytics/funnel';
import {
  computeCatalogStats,
  listPanelProducts,
  LOW_STOCK_THRESHOLD,
} from '../../src/lib/panel/products';
import {
  CHART_PALETTE,
  financialStatusLabel,
  formatMoney,
  formatPercent,
  formatShortDay,
  STATUS_COLORS,
} from './_components/format';
import { BiHero, DeltaChip, KpiCard, Panel, PageHeader } from './_components/ui';
import { AreaTrend, Donut, HBar } from './_components/charts';

export const metadata: Metadata = { title: 'Overview — 801 Outlet Panel' };
export const dynamic = 'force-dynamic';

const SHORTCUTS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}> = [
  { href: '/admin/products/new', label: 'New product', icon: Plus },
  { href: '/admin/products/import', label: 'Import CSV', icon: FileUp },
  { href: '/admin/products/export', label: 'Export CSV', icon: Download, external: true },
  { href: '/admin/orders', label: 'Orders', icon: ReceiptText },
  { href: '/admin/funnel', label: 'Funnel', icon: Filter },
  { href: 'https://801outlet.com', label: 'View store', icon: Store, external: true },
];

export default async function AdminOverviewPage() {
  const funnelConfigured = isFunnelStorageConfigured();
  const [summary, products, funnelRows, sources] = await Promise.all([
    getSalesSummary(30),
    listPanelProducts(),
    funnelConfigured ? getFunnelCounts(30) : Promise.resolve([] as FunnelDailyRow[]),
    funnelConfigured ? getFunnelBreakdown(30, 'src', 5) : Promise.resolve([] as BreakdownEntry[]),
  ]);
  const catalog = computeCatalogStats(products);

  const funnelTotals = FUNNEL_STEPS.reduce(
    (accumulator, step) => {
      accumulator[step] = funnelRows.reduce((sum, row) => sum + row.counts[step], 0);
      return accumulator;
    },
    {} as Record<FunnelStep, number>,
  );
  const funnelStages: Array<{ key: FunnelStep | 'purchase'; value: number }> = [
    ...FUNNEL_STEPS.map((step) => ({ key: step, value: funnelTotals[step] })),
    { key: 'purchase' as const, value: summary.orderCount },
  ];
  const funnelTop = funnelStages[0].value;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="OVERVIEW"
        title="Store"
        titleAccent="overview"
        subtitle="Sales from the last 30 days and the current state of the catalog."
        actions={
          <Link
            href="/admin/sales"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-semibold transition hover:border-[rgb(var(--fg))]"
          >
            <LineChart aria-hidden="true" className="size-4" />
            Full sales view
          </Link>
        }
      />

      {/* Revenue hero — the one number that matters, with its trend inside. */}
      <BiHero
        eyebrow="Revenue · last 30 days"
        value={formatMoney(summary.totalRevenue, summary.currencyCode)}
        side={
          <>
            <DeltaChip value={summary.revenueDelta} suffix="vs previous 30d" dark />
            <p className="text-xs text-white/50">
              {summary.orderCount} orders · {summary.unitsSold} units
            </p>
          </>
        }
      >
        {summary.totalRevenue === 0 ? (
          <p className="text-sm text-white/60">No sales recorded in the last 30 days.</p>
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
          sub={
            typeof summary.ordersDelta === 'number'
              ? `${summary.ordersDelta >= 0 ? '+' : '−'}${formatPercent(Math.abs(summary.ordersDelta))} vs previous`
              : undefined
          }
          spark={summary.daily.map((d) => d.orders)}
          href="/admin/orders"
        />
        <KpiCard
          title="Average order"
          value={formatMoney(summary.averageOrderValue, summary.currencyCode)}
          sub="last 30 days"
        />
        <KpiCard
          title="Visits (30d)"
          value={funnelConfigured ? String(funnelTotals.session) : '—'}
          sub={funnelConfigured ? 'unique sessions' : 'connect storage'}
          spark={funnelConfigured ? funnelRows.map((row) => row.counts.session) : undefined}
          href="/admin/funnel"
        />
        <KpiCard
          title="Visit → order"
          value={
            funnelConfigured && funnelTop > 0 ? formatPercent(summary.orderCount / funnelTop) : '—'
          }
          sub="overall conversion"
          href="/admin/funnel"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Conversion funnel (30d)" className="xl:col-span-2">
          {!funnelConfigured || funnelTop === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">
              {funnelConfigured
                ? 'No traffic recorded yet.'
                : 'Connect the event storage to see the funnel.'}
            </p>
          ) : (
            <ol className="space-y-3">
              {funnelStages.map((stage, index) => {
                const previous = index === 0 ? null : funnelStages[index - 1].value;
                const stepRate = previous && previous > 0 ? stage.value / previous : null;
                const width = Math.max((stage.value / funnelTop) * 100, 2);
                return (
                  <li key={stage.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{FUNNEL_STEP_LABEL[stage.key]}</span>
                      <span className="tabular-nums">
                        <span className="font-bold">{stage.value}</span>
                        {stepRate === null ? null : (
                          <span className="ml-2 text-xs text-[rgb(var(--muted))]">
                            {formatPercent(stepRate)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 h-6 overflow-hidden rounded-lg bg-[rgb(var(--surface-muted))]">
                      <div
                        className="h-full rounded-lg bg-[#6f8352]/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Traffic sources (30d)">
            {sources.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">Fills in as visits arrive.</p>
            ) : (
              <HBar
                rows={sources.map((entry) => ({
                  label: TRAFFIC_SOURCE_LABEL[entry.label as TrafficSource] ?? entry.label,
                  value: entry.count,
                }))}
              />
            )}
          </Panel>
          <Panel title="Payment status">
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Best sellers (30d)"
          action={
            <Link
              href="/admin/sales"
              className="text-xs font-semibold text-[rgb(var(--sage-ink))] hover:underline"
            >
              See sales
            </Link>
          }
        >
          <HBar
            rows={summary.bestSellers.slice(0, 6).map((item) => ({
              label: item.title,
              value: item.quantity,
              hint: formatMoney(item.revenue, summary.currencyCode),
              imageUrl: item.imageUrl,
            }))}
          />
        </Panel>

        <Panel
          title={`Low stock (≤ ${LOW_STOCK_THRESHOLD} units)`}
          action={
            <Link
              href="/admin/products?stock=low"
              className="text-xs font-semibold text-[rgb(var(--sage-ink))] hover:underline"
            >
              See all
            </Link>
          }
        >
          {catalog.lowStock.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">
              Every active product has stock above the threshold.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {catalog.lowStock.map((entry) => (
                <li
                  key={`${entry.productId}-${entry.variantTitle ?? 'default'}`}
                  className="flex items-center gap-3"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
                    {entry.imageUrl ? (
                      <Image
                        src={entry.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{entry.title}</p>
                    {entry.variantTitle ? (
                      <p className="truncate text-xs text-[rgb(var(--muted))]">
                        {entry.variantTitle}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      entry.quantity <= 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <AlertTriangle aria-hidden="true" className="size-3" />
                    {entry.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard title="Products" value={String(catalog.total)} href="/admin/products" />
        <KpiCard
          title="Active"
          value={String(catalog.active)}
          href="/admin/products?status=ACTIVE"
        />
        <KpiCard title="Drafts" value={String(catalog.draft)} href="/admin/products?status=DRAFT" />
        <KpiCard
          title="Out of stock"
          value={String(catalog.outOfStock)}
          sub="active products"
          href="/admin/products?stock=out"
        />
      </div>

      <Panel title="Management">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {SHORTCUTS.map((shortcut) => {
            const inner = (
              <>
                <span className="flex size-9 items-center justify-center rounded-lg bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))] ring-1 ring-[rgb(var(--border))] transition ring-inset group-hover:bg-[rgb(var(--sage-soft))] group-hover:text-[rgb(var(--sage-ink))]">
                  <shortcut.icon aria-hidden="true" className="size-[18px]" />
                </span>
                {shortcut.label}
              </>
            );
            const className =
              'group flex flex-col items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-4 text-center text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[rgb(var(--sage-ink))]/40 hover:shadow-md';
            return shortcut.external ? (
              <a key={shortcut.href} href={shortcut.href} className={className}>
                {inner}
              </a>
            ) : (
              <Link key={shortcut.href} href={shortcut.href} className={className}>
                {inner}
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
