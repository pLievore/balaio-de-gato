import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter } from 'lucide-react';

import { countOrdersInPeriod } from '../../../src/lib/panel/overview';
import {
  FUNNEL_STEPS,
  FUNNEL_STEP_LABEL,
  TRAFFIC_SOURCE_LABEL,
  getFunnelBreakdown,
  getFunnelCounts,
  type BreakdownEntry,
  type FunnelStep,
  type TrafficSource,
} from '../../../src/lib/analytics/funnel';
import { formatPercent, formatShortDay } from '../_components/format';
import { BiHero, KpiCard, PageHeader, Panel } from '../_components/ui';
import { AreaTrend } from '../_components/charts';

export const metadata: Metadata = { title: 'Funil — Painel Balaio de Gato' };
export const dynamic = 'force-dynamic';

const PERIODS = [7, 30] as const;


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

  const [rows, orderCount, sources, locations] = await Promise.all([
    getFunnelCounts(days),
    countOrdersInPeriod(days === 7 ? 7 : 30),
    getFunnelBreakdown(days, 'src'),
    getFunnelBreakdown(days, 'geo'),
  ]);

  const totals = FUNNEL_STEPS.reduce(
    (accumulator, step) => {
      accumulator[step] = rows.reduce((sum, row) => sum + row.counts[step], 0);
      return accumulator;
    },
    {} as Record<FunnelStep, number>,
  );

  // O pedido vem do PostgreSQL, que é o sistema de registro da loja.
  const stages: Array<{ key: FunnelStep | 'purchase'; value: number }> = [
    ...FUNNEL_STEPS.map((step) => ({ key: step, value: totals[step] })),
    { key: 'purchase' as const, value: orderCount },
  ];

  const top = stages[0].value;
  const overallRate = top > 0 ? orderCount / top : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ANÁLISE"
        title="Funil"
        titleAccent="do site"
        subtitle="Da visita ao pedido: as etapas vêm do site e o fecho vem do banco."
        actions={
          <nav
            className="flex rounded-full border border-[rgb(var(--border))] bg-white p-1"
            aria-label="Período"
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


      <BiHero
        eyebrow={`Visitas · últimos ${days} dias`}
        value={String(totals.session)}
        side={
          <>
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-[#c9dbb2]">
              {formatPercent(overallRate)} visita → pedido
            </span>
            <p className="text-xs text-white/50">
              {orderCount} {orderCount === 1 ? 'pedido' : 'pedidos'} no período
            </p>
          </>
        }
      >
        {totals.session === 0 ? (
          <p className="text-sm text-white/60">
            Nenhuma visita registrada neste período ainda.
          </p>
        ) : (
          <AreaTrend
            data={rows.map((row) => ({
              date: row.date,
              value: row.counts.session,
              hint: `${formatShortDay(row.date)} — ${row.counts.session} ${row.counts.session === 1 ? 'visita' : 'visitas'}`,
            }))}
            maxLabel={String(Math.max(...rows.map((row) => row.counts.session)))}
            tone="dark"
            height={140}
          />
        )}
      </BiHero>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          title="Visualizações de produto"
          value={String(totals.product_view)}
          spark={rows.map((row) => row.counts.product_view)}
        />
        <KpiCard
          title="Adições ao carrinho"
          value={String(totals.add_to_cart)}
          spark={rows.map((row) => row.counts.add_to_cart)}
        />
        <KpiCard
          title="Envios de pedido iniciados"
          value={String(totals.checkout_start)}
          spark={rows.map((row) => row.counts.checkout_start)}
        />
        <KpiCard
          title="Visita → pedido"
          value={formatPercent(overallRate)}
          sub={`${orderCount} ${orderCount === 1 ? 'pedido' : 'pedidos'}`}
        />
      </div>

      <Panel title="Funnel">
        {top === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">
            Nenhum acesso registrado neste período ainda.
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
        <Panel title="De onde vêm os visitantes">
          <BreakdownList
            entries={sources.map((entry) => ({
              ...entry,
              label: TRAFFIC_SOURCE_LABEL[entry.label as TrafficSource] ?? entry.label,
            }))}
            emptyText="Nenhuma visita registrada neste período ainda."
          />
        </Panel>
        <Panel title="Cidades com mais visitas">
          <BreakdownList
            entries={locations}
            emptyText="Ainda sem dados de cidade — preenche conforme novas visitas chegam."
          />
        </Panel>
      </div>

      <Panel title="Por dia">
        {rows.length === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-[rgb(var(--muted))] uppercase">
                  <th className="py-2 pr-4 font-semibold">Dia</th>
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
        Visitas contam uma por sessão do navegador. Os pedidos vêm do banco, então a última etapa segue
        accurate even if a visitor finishes the purchase later.
      </p>
    </div>
  );
}
