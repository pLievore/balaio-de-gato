'use server';

/**
 * Criação do pedido.
 *
 * O carrinho vem do navegador e não merece confiança: aqui os itens são
 * recarregados do catálogo, os preços recalculados e as regras do programa
 * reaplicadas. Se o cliente mandou preço, ele é ignorado — o total do pedido
 * sai sempre do servidor.
 */

import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';

import { CATALOG_CACHE_TAG, getCartProducts } from '../../../src/lib/catalog/repository';
import { buildCartSummary, canSubmitOrder } from '../../../src/lib/cart/summary';
import type { CartLine } from '../../../src/lib/cart/types';
import { describeIssue } from '../../../src/lib/cart/types';
import { buildOrderItems, generateOrderCode, type Order } from '../../../src/lib/orders/order';
import {
  CheckoutChangedError,
  getOrderByCheckoutIdempotencyKey,
  issueOrderAccessToken,
  orderCodeExists,
  saveOrder,
} from '../../../src/lib/orders/repository';
import {
  collectFieldErrors,
  orderFormSchema,
  type FieldErrors,
} from '../../../src/lib/orders/schema';
import { getEducationStage } from '../../../src/lib/program/material-escolar';
import { consumeRateLimit, requestIdentifier } from '../../../src/lib/security/rate-limit';
import { isEmailConfigured, sendEmail } from '../../../src/lib/email/client';
import { orderReceivedEmail } from '../../../src/lib/email/templates';
import { orderTrackingPath } from '../../../src/lib/orders/access-token';
import { env } from '../../../src/config/env';

export type SubmitOrderState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: FieldErrors; formError?: string }
  | { status: 'cart-changed'; formError: string; issues: string[] }
  | {
      status: 'success';
      order: Order;
      /**
       * Chave de acompanhamento, mostrada uma única vez. Sem ela a página do
       * pedido só revela a situação — nome, telefone e endereço ficam fora.
       */
      accessToken: string | null;
      /** Se a confirmação por e-mail realmente saiu. A tela não promete o que não aconteceu. */
      emailSent: boolean;
    };

/** No máximo 60 linhas: acima disso é engano ou abuso, não uma lista escolar. */
const MAX_LINES = 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLines(raw: FormDataEntryValue | null): CartLine[] | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_LINES) return null;

    const lines: CartLine[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) return null;
      const { slug, quantity } = entry as Record<string, unknown>;
      if (typeof slug !== 'string' || slug.length === 0 || slug.length > 120) return null;
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
        return null;
      }
      lines.push({ slug, quantity });
    }
    return lines;
  } catch {
    return null;
  }
}

async function nextOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateOrderCode();
    if (!(await orderCodeExists(code))) return code;
  }
  // Com 32^6 combinações isto não deve acontecer; se acontecer, é melhor
  // falhar alto do que devolver um código já usado por outro pedido.
  throw new Error('Não foi possível gerar um código de pedido único.');
}

export async function submitOrder(
  _previous: SubmitOrderState,
  formData: FormData,
): Promise<SubmitOrderState> {
  // Antes de ler o formulário: cada pedido reserva estoque e grava em cinco
  // tabelas, então um envio repetido em massa custa caro e trava o catálogo
  // para quem está comprando de verdade.
  const verdict = await consumeRateLimit('checkout', requestIdentifier(await headers()));
  if (!verdict.allowed) {
    const minutos = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      status: 'cart-changed',
      formError:
        `Recebemos pedidos demais deste acesso. Tente de novo em ` +
        `${minutos === 1 ? 'um minuto' : `${minutos} minutos`}.`,
      issues: [],
    };
  }

  const idempotencyEntry = formData.get('checkoutIdempotencyKey');
  const idempotencyKey =
    typeof idempotencyEntry === 'string' ? idempotencyEntry.trim().toLowerCase() : '';
  if (!UUID_PATTERN.test(idempotencyKey)) {
    return {
      status: 'cart-changed',
      formError: 'A sessão do pedido expirou. Atualize a página e tente novamente.',
      issues: [],
    };
  }

  // A gravação anterior pode ter sido confirmada no banco e a resposta ter se
  // perdido. Nesse caso, devolvemos o mesmo pedido antes de revalidar o estoque
  // que ele próprio já reservou.
  const existingOrder = await getOrderByCheckoutIdempotencyKey(idempotencyKey);
  if (existingOrder) {
    // Repetição da mesma intenção: o pedido e o e-mail já saíram na primeira
    // vez. Uma chave nova apenas devolve o acesso a quem recarregou a página.
    return {
      status: 'success',
      order: existingOrder,
      accessToken: await issueOrderAccessToken(existingOrder.code),
      emailSent: isEmailConfigured(),
    };
  }

  const lines = parseLines(formData.get('linhas'));
  if (!lines) {
    return {
      status: 'cart-changed',
      formError: 'Não conseguimos ler os itens do carrinho. Volte e revise o pedido.',
      issues: [],
    };
  }

  const parsed = orderFormSchema.safeParse({
    responsavelNome: formData.get('responsavelNome'),
    responsavelCpf: formData.get('responsavelCpf'),
    email: formData.get('email'),
    telefone: formData.get('telefone'),
    etapa: formData.get('etapa'),
    cep: formData.get('cep'),
    logradouro: formData.get('logradouro'),
    numero: formData.get('numero'),
    complemento: formData.get('complemento') ?? '',
    bairro: formData.get('bairro'),
    cidade: formData.get('cidade'),
    uf: formData.get('uf'),
    observacoes: formData.get('observacoes') ?? '',
    aceiteRegras: formData.get('aceiteRegras') ?? false,
  });

  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // Recarrega tudo do catálogo e reaplica as regras com a etapa do formulário,
  // não com a que estava guardada no navegador.
  const products = await getCartProducts();
  const summary = buildCartSummary(lines, products, data.etapa);

  if (summary.missingSlugs.length > 0) {
    const count = summary.missingSlugs.length;
    return {
      status: 'cart-changed',
      formError: 'Alguns materiais do carrinho não estão mais disponíveis.',
      issues: [
        count === 1
          ? '1 material precisa ser removido antes de continuar.'
          : `${count} materiais precisam ser removidos antes de continuar.`,
      ],
    };
  }

  if (summary.items.length === 0) {
    return {
      status: 'cart-changed',
      formError: 'Seu carrinho está vazio ou os itens saíram do catálogo.',
      issues: [],
    };
  }

  if (!canSubmitOrder(summary)) {
    return {
      status: 'cart-changed',
      formError: 'Algo mudou desde que você montou o pedido. Revise o carrinho e tente de novo.',
      issues: summary.items.flatMap((item) =>
        item.issues.map((issue) => `${item.product.name}: ${describeIssue(issue)}`),
      ),
    };
  }

  const stage = getEducationStage(data.etapa);
  const items = buildOrderItems(lines, products);
  const subtotalInCents = items.reduce((total, item) => total + item.lineTotalInCents, 0);

  const order: Order = {
    code: await nextOrderCode(),
    status: 'awaiting_payment_link',
    createdAt: new Date().toISOString(),
    customer: {
      responsavelNome: data.responsavelNome,
      responsavelCpf: data.responsavelCpf,
      email: data.email,
      telefone: data.telefone,
      etapa: data.etapa,
    },
    address: {
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento || undefined,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
    },
    items,
    subtotalInCents,
    // A regra do programa proíbe cobrar a entrega da família.
    shippingInCents: 0,
    totalInCents: subtotalInCents,
    benefitInCents: stage?.benefitAmountInCents ?? 0,
    overBudgetInCents: summary.overBudgetInCents,
    observacoes: data.observacoes || undefined,
  };

  let persistedOrder: Order;
  try {
    persistedOrder = await saveOrder(order, { idempotencyKey });
  } catch (error) {
    if (error instanceof CheckoutChangedError) {
      return {
        status: 'cart-changed',
        formError: error.message,
        issues: error.issues,
      };
    }
    throw error;
  }

  // O pedido acabou de reservar estoque, e o catálogo em cache mostra
  // `on_hand - reserved`. Sem invalidar aqui, a última unidade continuaria
  // anunciada como disponível até o TTL vencer.
  revalidateTag(CATALOG_CACHE_TAG, 'max');

  const accessToken = await issueOrderAccessToken(persistedOrder.code);
  const emailSent = await sendConfirmation(persistedOrder, accessToken);

  return { status: 'success', order: persistedOrder, accessToken, emailSent };
}

/**
 * Manda a confirmação e diz se ela saiu.
 *
 * O pedido já está gravado quando chegamos aqui, então nada nesta função pode
 * derrubar a resposta: o cliente precisa ver o código na tela mesmo que o
 * provedor de e-mail esteja fora. O que se perde no envio é recuperado pelo
 * painel, que tem o pedido inteiro.
 */
async function sendConfirmation(order: Order, accessToken: string | null): Promise<boolean> {
  const trackingUrl = `${env.siteUrl}${orderTrackingPath(order.code, accessToken)}`;
  const outcome = await sendEmail({
    to: order.customer.email,
    ...orderReceivedEmail(order, trackingUrl),
  });

  if (outcome.status !== 'sent') {
    console.warn(`[checkout] confirmação de ${order.code} não enviada: ${outcome.reason}`);
  }
  return outcome.status === 'sent';
}
