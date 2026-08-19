/**
 * Mensagens transacionais da loja.
 *
 * São funções puras: recebem o pedido e devolvem assunto, texto e HTML. Nada
 * aqui abre conexão, o que deixa o conteúdo — inclusive o aviso antifraude —
 * coberto por teste.
 *
 * Duas regras valem para todo modelo daqui:
 *
 *  1. Nunca pedir senha ou código do cartão virtual. O e-mail é justamente o
 *     canal onde o golpe imita a loja, então toda mensagem carrega o aviso.
 *  2. Nunca escrever o CPF, nem mascarado. O e-mail atravessa servidores que
 *     não são nossos e fica guardado em caixas que não controlamos.
 */

import { formatBRL } from '../money';
import { ORDER_STATUS_DESCRIPTION, ORDER_STATUS_LABEL, type Order } from '../orders/order';

export type EmailContent = {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
};

const AVISO =
  'A Balaio de Gato nunca pede a senha nem o código do cartão virtual do Kit Escolar ' +
  'por e-mail, telefone ou mensagem. Se alguém pedir em nosso nome, não informe.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Primeiro nome, que é como se fala com alguém — e evita o nome completo no assunto. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function itemLinesText(order: Order): string {
  return order.items
    .map(
      (item) =>
        `  ${item.quantity} × ${item.name} — ${formatBRL(item.lineTotalInCents)}`,
    )
    .join('\n');
}

function itemLinesHtml(order: Order): string {
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e7e2d8">` +
        `<strong>${escapeHtml(item.name)}</strong><br>` +
        `<span style="color:#6b6459;font-size:13px">${item.quantity} × ${formatBRL(item.unitPriceInCents)}</span>` +
        `</td><td style="padding:8px 0;border-bottom:1px solid #e7e2d8;text-align:right;white-space:nowrap">` +
        `${formatBRL(item.lineTotalInCents)}</td></tr>`,
    )
    .join('');
}

function shell(title: string, body: string): string {
  return (
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;` +
    `max-width:560px;margin:0 auto;padding:24px;color:#2a2721;line-height:1.6">` +
    `<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>` +
    body +
    `<p style="margin-top:32px;padding-top:16px;border-top:1px solid #e7e2d8;` +
    `font-size:12px;color:#6b6459">${escapeHtml(AVISO)}</p>` +
    `</div>`
  );
}

/** Confirmação enviada assim que o pedido entra na loja. */
export function orderReceivedEmail(order: Order, trackingUrl: string): EmailContent {
  const nome = firstName(order.customer.responsavelNome);
  const total = formatBRL(order.totalInCents);

  const text = [
    `Olá, ${nome}.`,
    '',
    `Recebemos o seu pedido ${order.code}.`,
    '',
    'Itens:',
    itemLinesText(order),
    '',
    `Total: ${total}`,
    'Entrega: grátis',
    '',
    'O que acontece agora:',
    '1. A loja confere os itens e a elegibilidade no programa.',
    '2. Você recebe por e-mail um link seguro para pagar com o crédito do Kit Escolar.',
    '3. Depois do pagamento confirmado, separamos e entregamos.',
    '',
    'Acompanhe pelo link abaixo. Ele é pessoal — guarde como guardaria uma senha.',
    trackingUrl,
    '',
    AVISO,
  ].join('\n');

  const html = shell(
    `Recebemos o seu pedido ${order.code}`,
    `<p>Olá, ${escapeHtml(nome)}.</p>` +
      `<p>Seu pedido chegou à loja. Guarde o código <strong>${escapeHtml(order.code)}</strong> — ` +
      `é por ele que encontramos o pedido no atendimento.</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:20px 0">${itemLinesHtml(order)}` +
      `<tr><td style="padding:12px 0"><strong>Total</strong></td>` +
      `<td style="padding:12px 0;text-align:right"><strong>${total}</strong></td></tr>` +
      `<tr><td style="padding-bottom:8px;color:#6b6459;font-size:13px">Entrega</td>` +
      `<td style="padding-bottom:8px;text-align:right;font-size:13px">Grátis</td></tr></table>` +
      `<ol style="padding-left:20px">` +
      `<li>A loja confere os itens e a elegibilidade no programa.</li>` +
      `<li>Você recebe um link seguro para pagar com o crédito do Kit Escolar.</li>` +
      `<li>Depois do pagamento confirmado, separamos e entregamos sem custo de frete.</li>` +
      `</ol>` +
      `<p style="margin:24px 0"><a href="${escapeHtml(trackingUrl)}" ` +
      `style="display:inline-block;background:#2a2721;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:999px;font-weight:700">Acompanhar o pedido</a></p>` +
      `<p style="font-size:13px;color:#6b6459">Este link é pessoal — guarde como guardaria uma senha.</p>`,
  );

  return { subject: `Pedido ${order.code} recebido — Balaio de Gato`, text, html };
}

/** Aviso de que o link de pagamento saiu, com a situação atual do pedido. */
export function orderStatusEmail(order: Order, trackingUrl: string): EmailContent {
  const nome = firstName(order.customer.responsavelNome);
  const rotulo = ORDER_STATUS_LABEL[order.status];
  const descricao = ORDER_STATUS_DESCRIPTION[order.status];

  const text = [
    `Olá, ${nome}.`,
    '',
    `Seu pedido ${order.code} está em: ${rotulo}.`,
    descricao,
    '',
    'Acompanhe pelo link abaixo:',
    trackingUrl,
    '',
    AVISO,
  ].join('\n');

  const html = shell(
    `Pedido ${order.code}: ${rotulo}`,
    `<p>Olá, ${escapeHtml(nome)}.</p>` +
      `<p>${escapeHtml(descricao)}</p>` +
      `<p style="margin:24px 0"><a href="${escapeHtml(trackingUrl)}" ` +
      `style="display:inline-block;background:#2a2721;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:999px;font-weight:700">Ver o pedido</a></p>`,
  );

  return { subject: `Pedido ${order.code}: ${rotulo} — Balaio de Gato`, text, html };
}
