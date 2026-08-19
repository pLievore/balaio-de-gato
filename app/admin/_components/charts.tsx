'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

import { formatMoney, formatShortDay } from './format';

export type TrendPoint = {
  date: string;
  value: number;
  /** Prebuilt tooltip text (server formats money/labels). */
  hint: string;
};

/**
 * Smooth area trend with gradient fill and gridlines — the "Power BI card"
 * look. Renders in a normalized 100×44 viewBox; labels live outside the SVG
 * so they never distort. Value formatting happens on the server via
 * `hint`/`maxLabel`, so the same chart plots revenue or counts.
 */
export function AreaTrend({
  data,
  maxLabel,
  tone = 'light',
  height = 180,
}: {
  data: TrendPoint[];
  /** Label for the highest gridline (e.g. "$4,200" or "38"). */
  maxLabel: string;
  tone?: 'light' | 'dark';
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: (i / n) * 100,
    y: 42 - (d.value / max) * 38,
  }));
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L100,44 L0,44 Z`;
  const last = points[points.length - 1];
  const gradientId = `area-${tone}`;
  const stroke = tone === 'dark' ? '#c9dbb2' : '#6f8352';
  const grid = tone === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelClass = tone === 'dark' ? 'text-white/50' : 'text-[rgb(var(--muted))]';
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 100 44"
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          role="img"
          aria-label="Gráfico de área da série diária"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.45" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[11, 22, 33].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={grid} strokeWidth="0.3" />
          ))}
          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="0.9"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ strokeWidth: 2 }}
          />
          {data.map((d, i) => (
            <rect
              key={d.date}
              x={(i / Math.max(data.length, 1)) * 100}
              y="0"
              width={100 / Math.max(data.length, 1)}
              height="44"
              fill="transparent"
            >
              <title>{d.hint}</title>
            </rect>
          ))}
          {last ? (
            <motion.circle
              cx={last.x}
              cy={last.y}
              r="1.1"
              fill={stroke}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            />
          ) : null}
        </svg>
        <span
          className={`pointer-events-none absolute top-0 right-0 text-[10px] font-semibold tabular-nums ${labelClass}`}
        >
          {maxLabel}
        </span>
      </div>
      <div className={`mt-1 flex justify-between text-[10px] ${labelClass}`}>
        {data
          .filter((_, index) => index % labelEvery === 0)
          .map((day) => (
            <span key={day.date}>{formatShortDay(day.date)}</span>
          ))}
      </div>
    </div>
  );
}

/** Tiny inline trend for KPI cards. */
export function Sparkline({
  values,
  height = 36,
  color = '#6f8352',
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...values);
  const n = Math.max(values.length - 1, 1);
  const line = values
    .map(
      (value, index) =>
        `${index === 0 ? 'M' : 'L'}${((index / n) * 100).toFixed(2)},${(
          30 -
          (value / max) * 26
        ).toFixed(2)}`,
    )
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    >
      <path d={`${line} L100,32 L0,32 Z`} fill={color} opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ strokeWidth: 1.8 }}
      />
    </svg>
  );
}

export function RevenueBarChart({
  data,
  currency,
  height = 170,
}: {
  data: Array<{ date: string; revenue: number; orders: number }>;
  currency: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const barWidth = 100 / Math.max(data.length, 1);
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Gráfico de barras da série diária"
      >
        {data.map((day, index) => {
          const barHeight = (day.revenue / max) * (height - 20);
          return (
            <motion.rect
              key={day.date}
              initial={{ height: 0, y: height - 16 }}
              animate={{
                height: Math.max(barHeight, day.revenue > 0 ? 2 : 0.75),
                y: height - 16 - Math.max(barHeight, day.revenue > 0 ? 2 : 0.75),
              }}
              transition={{ delay: index * 0.012, duration: 0.4, ease: 'easeOut' }}
              x={index * barWidth + barWidth * 0.15}
              width={barWidth * 0.7}
              rx={0.6}
              className={day.revenue > 0 ? 'fill-[#6f8352]' : 'fill-[#e2e5df]'}
            >
              <title>{`${formatShortDay(day.date)} — ${formatMoney(day.revenue, currency)} · ${day.orders} order${day.orders === 1 ? '' : 's'}`}</title>
            </motion.rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[rgb(var(--muted))]">
        {data
          .filter((_, index) => index % labelEvery === 0)
          .map((day) => (
            <span key={day.date}>{formatShortDay(day.date)}</span>
          ))}
      </div>
    </div>
  );
}

export function Donut({
  segments,
  centerLabel,
  size = 148,
}: {
  segments: Array<{ label: string; value: number; color: string; hint?: string }>;
  centerLabel?: { value: string; label: string };
  size?: number;
}) {
  const total = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.value, 0),
  );
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const arcs: Array<(typeof segments)[number] & { dash: number; offset: number }> = [];
  for (const segment of segments) {
    const dash = (segment.value / total) * circumference;
    const previous = arcs[arcs.length - 1];
    arcs.push({
      ...segment,
      dash,
      offset: previous ? previous.offset + previous.dash : 0,
    });
  }

  if (segments.length === 0) {
    return <p className="text-sm text-[rgb(var(--muted))]">Sem dados neste período.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 150 150" className="-rotate-90" style={{ width: size, height: size }}>
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="19"
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
            >
              <title>{`${arc.label}: ${arc.value}`}</title>
            </circle>
          ))}
        </svg>
        {centerLabel ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xl leading-none font-bold tabular-nums">{centerLabel.value}</p>
            <p className="mt-1 text-[10px] font-semibold tracking-wide text-[rgb(var(--muted))] uppercase">
              {centerLabel.label}
            </p>
          </div>
        ) : null}
      </div>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: segment.color }} />
            <span className="min-w-0 truncate text-[rgb(var(--muted))] capitalize">
              {segment.label}
            </span>
            <span className="font-semibold tabular-nums">{segment.value}</span>
            {segment.hint ? (
              <span className="text-xs text-[rgb(var(--muted))]">{segment.hint}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBar({
  rows,
  emptyLabel = 'Sem dados neste período.',
}: {
  rows: Array<{
    label: string;
    value: number;
    hint?: string;
    href?: string;
    imageUrl?: string | null;
  }>;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) {
    return <p className="text-sm text-[rgb(var(--muted))]">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row, index) => {
        const content = (
          <>
            {row.imageUrl !== undefined ? (
              <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
                {row.imageUrl ? (
                  <Image src={row.imageUrl} alt="" fill sizes="36px" className="object-cover" />
                ) : null}
              </span>
            ) : null}
            <span className="w-28 shrink-0 truncate text-xs sm:w-40 sm:text-sm" title={row.label}>
              {row.label}
            </span>
            <div className="relative h-6 min-w-10 flex-1 overflow-hidden rounded bg-[rgb(var(--surface-muted))]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(row.value / max) * 100}%` }}
                transition={{ delay: index * 0.04, duration: 0.45, ease: 'easeOut' }}
                className="h-full rounded bg-[#6f8352]/80"
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums sm:text-sm">
              {row.hint ?? row.value}
            </span>
          </>
        );
        return row.href ? (
          <Link
            key={row.label}
            href={row.href}
            className="-mx-1 flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-[rgb(var(--surface-muted))] sm:gap-3"
          >
            {content}
          </Link>
        ) : (
          <div key={row.label} className="flex items-center gap-2 sm:gap-3">
            {content}
          </div>
        );
      })}
    </div>
  );
}
