/**
 * Cálculo do carrinho.
 *
 * Módulo puro: recebe as linhas guardadas, os produtos recarregados e a etapa
 * escolhida, e devolve tudo que a interface precisa mostrar — inclusive o que
 * impede o pedido de seguir. É a mesma função usada na tela e na validação do
 * servidor, para que as duas nunca discordem sobre o total.
 */

import { getEducationStage } from '../program/material-escolar';
import type { CartProduct } from '../catalog/product';
import type { CartIssue, CartLine } from './types';

export type CartItemView = {
  product: CartProduct;
  quantity: number;
  lineTotalInCents: number;
  /** Economia da linha, quando o item está em oferta. */
  lineSavingsInCents: number;
  issues: CartIssue[];
};

export type CartSummary = {
  items: CartItemView[];
  /** Slugs que estavam no carrinho e não existem mais no catálogo. */
  missingSlugs: string[];
  itemCount: number;
  subtotalInCents: number;
  savingsInCents: number;
  /** Crédito da etapa escolhida; nulo quando nenhuma etapa foi escolhida. */
  benefitInCents: number | null;
  /** Quanto sobra do crédito. Negativo significa que passou do saldo. */
  remainingInCents: number | null;
  /** Quanto excede o crédito. Zero quando cabe. */
  overBudgetInCents: number;
  /** Fração do crédito já usada, de 0 a 1 — alimenta a barra de saldo. */
  benefitUsedRatio: number;
  /** Verdadeiro quando alguma linha impede o envio do pedido. */
  hasBlockingIssues: boolean;
};

function issuesFor(product: CartProduct, quantity: number, stageSlug: string | null): CartIssue[] {
  const issues: CartIssue[] = [];

  if (product.stock <= 0) {
    issues.push({ kind: 'esgotado' });
  } else if (quantity > product.stock) {
    issues.push({ kind: 'estoque-insuficiente', available: product.stock });
  }

  if (quantity > product.maxPerOrder) {
    issues.push({ kind: 'acima-do-limite', maxPerOrder: product.maxPerOrder });
  }

  if (stageSlug && !product.stages.includes(stageSlug)) {
    const stage = getEducationStage(stageSlug);
    issues.push({ kind: 'fora-da-etapa', stageName: stage?.shortName ?? 'esta etapa' });
  }

  return issues;
}

export function buildCartSummary(
  lines: readonly CartLine[],
  products: readonly CartProduct[],
  stageSlug: string | null,
): CartSummary {
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const items: CartItemView[] = [];
  const missingSlugs: string[] = [];

  /*
   * Duas linhas do mesmo material viram uma antes de qualquer conta.
   *
   * O carrinho do navegador já funde por slug, então isto só acontece com uma
   * requisição forjada — que é exatamente o que a validação do servidor existe
   * para tratar. Sem a fusão, `[{caderno,2},{caderno,2}]` passava por um limite
   * de 3 por pedido: cada linha era conferida sozinha, e o total de 4 só
   * esbarrava no banco, com a mensagem errada ("o estoque mudou") em vez de
   * falar em limite.
   */
  const consolidadas = new Map<string, number>();
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    consolidadas.set(line.slug, (consolidadas.get(line.slug) ?? 0) + line.quantity);
  }

  for (const [slug, quantity] of consolidadas) {
    const line = { slug, quantity };
    const product = bySlug.get(line.slug);
    if (!product) {
      missingSlugs.push(line.slug);
      continue;
    }
    if (line.quantity <= 0) continue;

    const unitSavings = product.compareAtPriceInCents
      ? Math.max(0, product.compareAtPriceInCents - product.priceInCents)
      : 0;

    items.push({
      product,
      quantity: line.quantity,
      lineTotalInCents: product.priceInCents * line.quantity,
      lineSavingsInCents: unitSavings * line.quantity,
      issues: issuesFor(product, line.quantity, stageSlug),
    });
  }

  const subtotalInCents = items.reduce((total, item) => total + item.lineTotalInCents, 0);
  const savingsInCents = items.reduce((total, item) => total + item.lineSavingsInCents, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const stage = stageSlug ? getEducationStage(stageSlug) : undefined;
  const benefitInCents = stage?.benefitAmountInCents ?? null;
  const remainingInCents = benefitInCents === null ? null : benefitInCents - subtotalInCents;
  const overBudgetInCents = remainingInCents === null ? 0 : Math.max(0, -remainingInCents);

  return {
    items,
    missingSlugs,
    itemCount,
    subtotalInCents,
    savingsInCents,
    benefitInCents,
    remainingInCents,
    overBudgetInCents,
    benefitUsedRatio:
      benefitInCents === null || benefitInCents === 0
        ? 0
        : Math.min(1, subtotalInCents / benefitInCents),
    hasBlockingIssues: items.some((item) => item.issues.length > 0),
  };
}

/**
 * Passar do crédito não impede o pedido: o responsável pode completar a
 * diferença por outro meio, e a loja confirma isso no atendimento. O que
 * impede é item indisponível, acima do limite ou fora da etapa.
 */
export function canSubmitOrder(summary: CartSummary): boolean {
  return summary.items.length > 0 && !summary.hasBlockingIssues;
}
