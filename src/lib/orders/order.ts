/**
 * O pedido.
 *
 * No MVP o pagamento é por link DUEPAY assistido: o pedido nasce em
 * `awaiting_payment_link`, a loja confere os itens, envia o link e só então o
 * responsável paga. Nenhum estado aqui envolve o site tocar em senha ou código
 * do cartão virtual — o site só sabe que um link foi enviado e que voltou pago.
 */

import type { CartLine } from '../cart/types';

export type OrderStatus =
  | 'draft'
  | 'awaiting_payment_link'
  | 'payment_link_sent'
  | 'paid'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'manual_review';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Pedido em preenchimento',
  awaiting_payment_link: 'Aguardando conferência',
  payment_link_sent: 'Link de pagamento enviado',
  paid: 'Pagamento confirmado',
  preparing: 'Em separação',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  manual_review: 'Em análise pela loja',
};

export const ORDER_STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  draft: 'O pedido ainda não foi enviado para a loja.',
  awaiting_payment_link:
    'A loja está conferindo a disponibilidade dos itens e a elegibilidade no programa.',
  payment_link_sent:
    'Enviamos um link seguro de pagamento para o seu e-mail. Ele é usado no aplicativo do Kit Escolar.',
  paid: 'O pagamento foi confirmado e o pedido entrou na fila de separação.',
  preparing: 'Estamos separando e conferindo os materiais do seu pedido.',
  out_for_delivery: 'O pedido está a caminho do endereço informado.',
  delivered: 'O pedido foi entregue no endereço informado.',
  cancelled: 'Este pedido foi cancelado. Fale com a loja se não foi você quem pediu.',
  manual_review: 'A equipe está analisando o pedido e entrará em contato se precisar de algo.',
};

export type OrderItem = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  quantity: number;
  /** Preço no momento do pedido — o catálogo pode mudar depois. */
  unitPriceInCents: number;
  lineTotalInCents: number;
};

export type OrderCustomer = {
  responsavelNome: string;
  /** Guardado só com os dígitos; a exibição usa `maskCPF`. */
  responsavelCpf: string;
  email: string;
  telefone: string;
  etapa: string;
};

export type OrderAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type Order = {
  code: string;
  status: OrderStatus;
  createdAt: string;
  customer: OrderCustomer;
  address: OrderAddress;
  items: OrderItem[];
  subtotalInCents: number;
  /** Entrega é sempre gratuita: a regra proíbe cobrar a família pelo frete. */
  shippingInCents: 0;
  totalInCents: number;
  benefitInCents: number;
  /** Quanto do total excede o crédito da etapa. */
  overBudgetInCents: number;
  observacoes?: string;
};

/**
 * Transições permitidas do pedido.
 *
 * O fluxo do MVP é assistido: a loja confere o pedido, envia o link DUEPAY,
 * confirma o pagamento e só então separa e entrega. Cada seta aqui é uma ação
 * que uma pessoa executa no painel — nada avança sozinho.
 *
 * `paid` não volta para cancelado: desfazer um pagamento exige estorno e
 * devolução de estoque, que este serviço ainda não faz. Melhor recusar a
 * transição do que fingir que ela é reversível.
 *
 * A tabela mora aqui, e não no repositório, para o painel poder desenhar os
 * botões disponíveis sem importar o banco junto.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ['awaiting_payment_link', 'cancelled'],
  awaiting_payment_link: ['payment_link_sent', 'manual_review', 'cancelled'],
  payment_link_sent: ['paid', 'manual_review', 'cancelled'],
  manual_review: ['awaiting_payment_link', 'payment_link_sent', 'cancelled'],
  paid: ['preparing'],
  preparing: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Rótulo do botão que executa a transição, na voz de quem opera a loja. */
export const ORDER_TRANSITION_ACTION: Record<OrderStatus, string> = {
  draft: 'Reabrir como rascunho',
  awaiting_payment_link: 'Voltar para conferência',
  payment_link_sent: 'Marcar link como enviado',
  paid: 'Confirmar pagamento',
  preparing: 'Iniciar separação',
  out_for_delivery: 'Sair para entrega',
  delivered: 'Confirmar entrega',
  cancelled: 'Cancelar pedido',
  manual_review: 'Enviar para análise manual',
};

/**
 * Código do pedido: `BG-` mais seis caracteres.
 *
 * O alfabeto omite I, O, 0 e 1 de propósito — o código é ditado por telefone no
 * atendimento, e esses quatro são os que as pessoas confundem.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `BG-${code}`;
}

export function isOrderCode(value: string): boolean {
  return new RegExp(`^BG-[${CODE_ALPHABET}]{6}$`).test(value.toUpperCase());
}

export function buildOrderItems(
  lines: readonly CartLine[],
  products: readonly {
    slug: string;
    sku: string;
    name: string;
    brand: string;
    priceInCents: number;
  }[],
): OrderItem[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  return lines.flatMap((line) => {
    const product = bySlug.get(line.slug);
    if (!product || line.quantity <= 0) return [];
    return [
      {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        quantity: line.quantity,
        unitPriceInCents: product.priceInCents,
        lineTotalInCents: product.priceInCents * line.quantity,
      },
    ];
  });
}
