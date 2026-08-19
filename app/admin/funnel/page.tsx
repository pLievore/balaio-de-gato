import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter, Info } from 'lucide-react';

import { getSalesSummary } from '../../../src/lib/panel/analytics';
import {
  FUNNEL_STEPS,
  FUNNEL_STEP_LABEL,
  TRAFFIC_SOURCE_LABEL,
  getFunnelBreakdown,
  getFunnelCounts,
  isFunnelStorageConfigured,
  type BreakdownEntry,
  type FunnelStep,
  type TrafficSource,
} from '../../../src/lib/analytics/funnel';
import { formatPercent, formatShortDay } from '../_components/format';
import { BiHero, KpiCard, PageHeader, Panel } from '../_components/ui';
import { AreaTrend } from '../_components/charts';

export const metadata: Metadata = { title: 'Funnel — 801 Outlet Panel' };
export const dynamic = 'force-dynamic';

const PERIODS = [7, 30] as const;

function SetupNotice() {
  return (
    <Panel title="Event collection is not connected yet">
      <div className="flex gap-3">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[rgb(var(--sage-ink))]" />
        <div className="text-sm leading-6 text-[rgb(var(--muted))]">
          <p>
            The storefront is already sending funnel events, but they need a place to be counted. In
            the Vercel dashboard open{' '}
            <span className="font-semibold text-[rgb(var(--fg))]">
              Storage → Create Database → Upstash for Redis
            </span>
            , connect it to this project and redeploy. Nothing else is needed — the panel picks the
            credentials up automatically.
          </p>
          <p className="mt-3">
            Only daily totals are stored: no cookies, no visitor identifiers, no personal data.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function BreakdownList({ entries, emptyText }: { entries: BreakdownEntry[]; emptyText: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[rgb(var(--muted))]">{emptyText}</p>;
  }
  const max = entries[0].count;

  return (
    <ol className="space-y-2.5">
      {entries.map((entry) => (
        <li key={entry.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{entry.label}</span>
            <span className="font-bold tabular-nums">{entry.count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]">
            <div
              className="h-full rounded-full bg-[#6f8352]/80"
              style={{ width: `${Math.max((entry.count / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const days = PERIODS.find((value) => String(value) === period) ?? 30;
  const configured = isFunnelStorageConfigured();

  const [rows, summary, sources, locations] = await Promise.all([
    configured ? getFunnelCounts(days) : Promise.resolve([]),
    getSalesSummary(days === 7 ? 7 : 30),
    configured ? getFunnelBreakdown(days, 'src') : Promise.resolve([] as BreakdownEntry[]),
    configured ? getFunnelBreakdown(days, 'geo') : Promise.resolve([] as BreakdownEntry[]),
  ]);

  const totals = FUNNEL_STEPS.reduce(
    (accumulator, step) => {
      accumulator[step] = rows.reduce((sum, row) => sum + row.counts[step], 0);
      return accumulator;
    },
    {} as Record<FunnelStep, number>,
  );

  // Orders come from Shopify, which is the authoritative source for purchases.
  const stages: Array<{ key: FunnelStep | 'purchase'; value: number }> = [
    ...FUNNEL_STEPS.map((step) => ({ key: step, value: totals[step] })),
    { key: 'purchase' as const, value: summary.orderCount },
  ];

  const top = stages[0].value;
  const overallRate = top > 0 ? summary.orderCount / top : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ANALYTICS"
        title="Site"
        titleAccent="funnel"
        subtitle="From visit to order, measured on the storefront and closed with Shopify order data."
        actions={
          <nav
            className="flex rounded-full border border-[rgb(var(--border))] bg-white p-1"
            aria-label="Period"
          >
            {PERIODS.map((value) => (
              <Link
                key={value}
                href={`/admin/funnel?period=${value}`}
                className={
                  value === days
                    ? 'rounded-full bg-[rgb(var(--fg))] px-4 py-1.5 text-xs font-bold text-white'
                    : 'rounded-full px-4 py-1.5 text-xs font-bold text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]'
                }
              >
                Last {value} days
              </Link>
            ))}
          </nav>
        }
      />

      {configured ? null : <SetupNotice />}

      <BiHero
        eyebrow={`Visits · last ${days} days`}
        value={String(totals.session)}
        side={
          <>
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-[#c9dbb2]">
              {formatPercent(overallRate)} visit → order
            </span>
            <p className="text-xs text-white/50">
              {summary.orderCount} order{summary.orderCount === 1 ? '' : 's'} in the period
            </p>
          </>
        }
      >
        {!configured || totals.session === 0 ? (
          <p className="text-sm text-white/60">
            {configured
              ? 'No visits recorded in this period yet.'
              : 'Connect the event storage to start counting visits.'}
          </p>
        ) : (
          <AreaTrend
            data={rows.map((row) => ({
              date: row.date,
              value: row.counts.session,
              hint: `${formatShortDay(row.date)} — ${row.counts.session} visit${row.counts.session === 1 ? '' : 's'}`,
            }))}
            maxLabel={String(Math.max(...rows.map((row) => row.counts.session)))}
            tone="dark"
            height={140}
          />
        )}
      </BiHero>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          title="Product views"
          value={String(totals.product_view)}
          spark={rows.map((row) => row.counts.product_view)}
        />
        <KpiCard
          title="Added to cart"
          value={String(totals.add_to_cart)}
          spark={rows.map((row) => row.counts.add_to_cart)}
        />
        <KpiCard
          title="Checkout started"
          value={String(totals.checkout_start)}
          spark={rows.map((row) => row.counts.checkout_start)}
        />
        <KpiCard
          title="Visit → order"
          value={formatPercent(overallRate)}
          sub={`${summary.orderCount} order${summary.orderCount === 1 ? '' : 's'}`}
        />
      </div>

      <Panel title="Funnel">
        {top === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">
            No traffic recorded in this period yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {stages.map((stage, index) => {
              const previous = index === 0 ? null : stages[index - 1].value;
              const stepRate = previous && previous > 0 ? stage.value / previous : null;
              const width = top > 0 ? Math.max((stage.value / top) * 100, 2) : 0;

              return (
                <li key={stage.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{FUNNEL_STEP_LABEL[stage.key]}</span>
                    <span className="tabular-nums">
                      <span className="font-bold">{stage.value}</span>
                      {stepRate === null ? null : (
                        <span className="ml-2 text-xs text-[rgb(var(--muted))]">
                          {formatPercent(stepRate)} of previous
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-8 overflow-hidden rounded-lg bg-[rgb(var(--surface-muted))]">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Where visitors come from">
          <BreakdownList
            entries={sources.map((entry) => ({
              ...entry,
              label: TRAFFIC_SOURCE_LABEL[entry.label as TrafficSource] ?? entry.label,
            }))}
            emptyText="No visits recorded in this period yet."
          />
        </Panel>
        <Panel title="Top visitor locations">
          <BreakdownList
            entries={locations}
            emptyText="No location data yet — it fills in as new visits arrive."
          />
        </Panel>
      </div>

      <Panel title="By day">
        {rows.length === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-[rgb(var(--muted))] uppercase">
                  <th className="py-2 pr-4 font-semibold">Day</th>
                  {FUNNEL_STEPS.map((step) => (
                    <th key={step} className="py-2 pr-4 font-semibold">
                      {FUNNEL_STEP_LABEL[step]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {[...rows].reverse().map((row) => (
                  <tr key={row.date}>
                    <td className="py-2 pr-4 font-medium">{row.date}</td>
                    {FUNNEL_STEPS.map((step) => (
                      <td key={step} className="py-2 pr-4 text-[rgb(var(--muted))] tabular-nums">
                        {row.counts[step]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
        <Filter aria-hidden="true" className="size-3.5" />
        Visits count one per browser session. Orders come from Shopify, so the last stage stays
        accurate even if a visitor finishes the purchase later.
      </p>
    </div>
  );
}
