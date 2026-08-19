/**
 * O carrinho guarda escolha, não preço.
 *
 * No navegador ficam apenas o slug do produto, a quantidade e a etapa
 * escolhida. Preço, estoque e elegibilidade são sempre recarregados do
 * servidor — assim um carrinho antigo no localStorage nunca consegue comprar
 * pelo valor de ontem nem levar um item que saiu do catálogo.
 */

export type CartLine = {
  slug: string;
  quantity: number;
};

export type AddToCartResult = { ok: true; quantity: number } | { ok: false; reason: string };

/**
 * Por que uma linha do carrinho não pode seguir para o pedido. Cada motivo tem
 * uma correção óbvia, e a interface mostra essa correção junto do aviso.
 */
export type CartIssue =
  | { kind: 'esgotado' }
  | { kind: 'estoque-insuficiente'; available: number }
  | { kind: 'acima-do-limite'; maxPerOrder: number }
  | { kind: 'fora-da-etapa'; stageName: string };

export function describeIssue(issue: CartIssue): string {
  switch (issue.kind) {
    case 'esgotado':
      return 'Este item ficou sem estoque.';
    case 'estoque-insuficiente':
      return issue.available === 1
        ? 'Resta apenas 1 unidade em estoque.'
        : `Restam apenas ${issue.available} unidades em estoque.`;
    case 'acima-do-limite':
      return `O limite é de ${issue.maxPerOrder} ${
        issue.maxPerOrder === 1 ? 'unidade' : 'unidades'
      } por pedido.`;
    case 'fora-da-etapa':
      return `Este item não está autorizado para ${issue.stageName}.`;
  }
}
