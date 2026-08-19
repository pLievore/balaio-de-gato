export function formatUsdCents(cents: number): string {
  const hasFraction = cents % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMoney(
  money: { amount: string; currencyCode: string },
  locale = 'en-US',
): string {
  const amount = Number(money.amount);

  if (!Number.isFinite(amount)) return money.amount;

  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
