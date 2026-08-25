export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(Math.abs(value) >= 0.1 ? 0 : 1)}%`;
}

export function formatShortDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function financialStatusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

/** Consistent palette for chart segments. */
export const CHART_PALETTE = [
  '#a84b08', // laranja oficial
  '#509fa3', // turquesa da marca
  '#ff5060', // coral da marca
  '#f0aa16', // amarelo da marca
  '#7656a4', // roxo dos detalhes
  '#70564c', // marrom secundário
];

export const STATUS_COLORS: Record<string, string> = {
  PAID: '#205e61',
  PENDING: '#a84b08',
  AUTHORIZED: '#509fa3',
  PARTIALLY_PAID: '#c37700',
  PARTIALLY_REFUNDED: '#8e6d55',
  REFUNDED: '#70564c',
  VOIDED: '#b12334',
  EXPIRED: '#8e6d55',
  UNKNOWN: '#8e6d55',
};
