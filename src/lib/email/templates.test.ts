import assert from 'node:assert/strict';
import { test } from 'node:test';

import { firstName, orderReceivedEmail, orderStatusEmail } from './templates';
import type { Order } from '../orders/order';

const PEDIDO: Order = {
  code: 'BG-K7M2QX',
  status: 'awaiting_payment_link',
  createdAt: '2026-03-10T12:00:00.000Z',
  customer: {
    responsavelNome: 'Maria da Silva Souza',
    responsavelCpf: '39053344705',
    email: 'maria@example.com',
    telefone: '11987654321',
    etapa: 'alfabetizacao',
  },
  address: {
    cep: '01310100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  items: [
    {
      slug: 'caderno-brochura',
      sku: 'CAD-BRO-96',
      name: 'Caderno brochura 96 folhas',
      brand: 'Tilibra',
      quantity: 2,
      unitPriceInCents: 1490,
      lineTotalInCents: 2980,
    },
  ],
  subtotalInCents: 2980,
  shippingInCents: 0,
  totalInCents: 2980,
  benefitInCents: 32000,
  overBudgetInCents: 0,
};

const LINK = 'https://balaio.example.com/pedido/BG-K7M2QX?t=ABCDEFGH23456789ABCDEFGH23456789';

// ─── o que nunca pode sair ──────────────────────────────────────────────────

test('o e-mail não carrega o CPF, nem mascarado', () => {
  // O e-mail atravessa servidores que não são nossos e fica guardado em
  // caixas que não controlamos.
  for (const conteudo of [orderReceivedEmail(PEDIDO, LINK), orderStatusEmail(PEDIDO, LINK)]) {
    const tudo = `${conteudo.subject} ${conteudo.text} ${conteudo.html}`;
    assert.ok(!tudo.includes('39053344705'), 'CPF em texto');
    assert.ok(!tudo.includes('390.533'), 'começo do CPF');
    assert.ok(!/\d{3}\.\D{3}\.\D{3}-\d{2}/.test(tudo), 'CPF mascarado');
  }
});

test('todo modelo repete o aviso antifraude', () => {
  // É o canal onde o golpe imita a loja; o aviso não pode faltar em nenhum.
  for (const conteudo of [orderReceivedEmail(PEDIDO, LINK), orderStatusEmail(PEDIDO, LINK)]) {
    assert.match(conteudo.text, /nunca pede a senha nem o código do cartão virtual/);
    assert.match(conteudo.html, /nunca pede a senha nem o código do cartão virtual/);
  }
});

test('o assunto não expõe o nome completo do responsável', () => {
  const { subject } = orderReceivedEmail(PEDIDO, LINK);
  assert.ok(!subject.includes('Maria da Silva Souza'));
  assert.match(subject, /BG-K7M2QX/);
});

// ─── conteúdo ───────────────────────────────────────────────────────────────

test('a confirmação traz código, itens, total e o link com a chave', () => {
  const { text, html } = orderReceivedEmail(PEDIDO, LINK);
  for (const conteudo of [text, html]) {
    assert.match(conteudo, /BG-K7M2QX/);
    assert.match(conteudo, /Caderno brochura 96 folhas/);
    assert.match(conteudo, /29,80/);
    assert.ok(conteudo.includes(LINK));
  }
});

test('a entrega aparece como grátis, como a regra do programa exige', () => {
  // Cobrar entrega da família é proibido; o e-mail precisa dizer isso.
  const { text, html } = orderReceivedEmail(PEDIDO, LINK);
  assert.match(text, /Entrega: grátis/i);
  assert.match(html, /Grátis/);
});

test('o aviso de mudança de situação usa o rótulo do pedido', () => {
  const { subject, text } = orderStatusEmail({ ...PEDIDO, status: 'payment_link_sent' }, LINK);
  assert.match(subject, /BG-K7M2QX/);
  assert.match(text, /BG-K7M2QX/);
  assert.ok(text.includes(LINK));
});

// ─── escape ─────────────────────────────────────────────────────────────────

test('nome com caractere de marcação não injeta HTML', () => {
  const malicioso: Order = {
    ...PEDIDO,
    customer: { ...PEDIDO.customer, responsavelNome: '<script>alert(1)</script> Souza' },
  };
  const { html } = orderReceivedEmail(malicioso, LINK);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('nome de produto com aspas e sinais é escapado', () => {
  const pedido: Order = {
    ...PEDIDO,
    items: [{ ...PEDIDO.items[0]!, name: 'Caderno "A&B" <especial>' }],
  };
  const { html } = orderReceivedEmail(pedido, LINK);
  assert.ok(!html.includes('<especial>'));
  assert.match(html, /&amp;/);
  assert.match(html, /&quot;/);
});

// ─── auxiliares ─────────────────────────────────────────────────────────────

test('o tratamento usa só o primeiro nome', () => {
  assert.equal(firstName('Maria da Silva Souza'), 'Maria');
  assert.equal(firstName('  João  Pedro '), 'João');
});

test('nome vazio não quebra o tratamento', () => {
  assert.equal(firstName('   '), '');
});
