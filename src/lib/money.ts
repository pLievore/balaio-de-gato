/**
 * Dinheiro em centavos de real.
 *
 * Todo valor do catálogo, do carrinho e do pedido é um inteiro em centavos.
 * Nada de ponto flutuante: R$ 0,10 somado três vezes tem de dar exatamente
 * R$ 0,30, e com `number` decimal não dá.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(amountInCents: number): string {
  return BRL.format(amountInCents / 100);
}

/**
 * Valor sem o símbolo, para quando o "R$" já aparece ao lado em outro tamanho
 * ou peso — o padrão editorial de preço em vitrine.
 */
export function formatBRLValue(amountInCents: number): string {
  return BRL.format(amountInCents / 100).replace(/^R\$\s*/, '');
}

/** Lê "12,90", "12.90" ou "R$ 12,90" e devolve centavos. `null` se não for válido. */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
