import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  allowedTransitions,
  canTransition,
  ORDER_STATUS_LABEL,
  ORDER_TRANSITION_ACTION,
  ORDER_TRANSITIONS,
  type OrderStatus,
} from './order';

const TODOS = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

test('o fluxo assistido chega de ponta a ponta', () => {
  const caminho: OrderStatus[] = [
    'draft',
    'awaiting_payment_link',
    'payment_link_sent',
    'paid',
    'preparing',
    'out_for_delivery',
    'delivered',
  ];

  for (let i = 0; i < caminho.length - 1; i += 1) {
    const de = caminho[i]!;
    const para = caminho[i + 1]!;
    assert.ok(canTransition(de, para), `${de} → ${para} deveria ser permitido`);
  }
});

test('cancelar é possível em todo estado anterior ao pagamento', () => {
  for (const status of [
    'draft',
    'awaiting_payment_link',
    'payment_link_sent',
    'manual_review',
  ] as OrderStatus[]) {
    assert.ok(canTransition(status, 'cancelled'), `${status} deveria poder cancelar`);
  }
});

test('depois de pago não se cancela — estorno e devolução não existem neste serviço', () => {
  for (const status of ['paid', 'preparing', 'out_for_delivery', 'delivered'] as OrderStatus[]) {
    assert.equal(
      canTransition(status, 'cancelled'),
      false,
      `${status} não deveria aceitar cancelamento`,
    );
  }
});

test('estados finais não saem do lugar', () => {
  assert.deepEqual(allowedTransitions('delivered'), []);
  assert.deepEqual(allowedTransitions('cancelled'), []);
});

test('não se pula o pagamento para separar o pedido', () => {
  assert.equal(canTransition('payment_link_sent', 'preparing'), false);
  assert.equal(canTransition('awaiting_payment_link', 'paid'), false);
  assert.equal(canTransition('draft', 'delivered'), false);
});

test('não se anda para trás no fluxo de entrega', () => {
  assert.equal(canTransition('delivered', 'out_for_delivery'), false);
  assert.equal(canTransition('out_for_delivery', 'preparing'), false);
  assert.equal(canTransition('preparing', 'paid'), false);
});

test('a análise manual devolve o pedido ao fluxo de pagamento', () => {
  assert.ok(canTransition('manual_review', 'awaiting_payment_link'));
  assert.ok(canTransition('manual_review', 'payment_link_sent'));
});

test('nenhum estado transiciona para si mesmo', () => {
  for (const status of TODOS) {
    assert.equal(canTransition(status, status), false, `${status} → ${status}`);
  }
});

test('todo destino declarado é um estado conhecido', () => {
  for (const status of TODOS) {
    for (const destino of allowedTransitions(status)) {
      assert.ok(TODOS.includes(destino), `${status} aponta para "${destino}", que não existe`);
    }
  }
});

test('todo estado tem rótulo e nome de ação para o painel', () => {
  for (const status of TODOS) {
    assert.ok(ORDER_STATUS_LABEL[status], `falta rótulo para ${status}`);
    assert.ok(ORDER_TRANSITION_ACTION[status], `falta nome de ação para ${status}`);
  }
});

test('todo estado é alcançável a partir de draft', () => {
  // Uma varredura em largura: se algum estado ficasse fora, o painel teria um
  // status que nenhuma operação consegue produzir.
  const visitados = new Set<OrderStatus>(['draft']);
  const fila: OrderStatus[] = ['draft'];

  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const proximo of allowedTransitions(atual)) {
      if (!visitados.has(proximo)) {
        visitados.add(proximo);
        fila.push(proximo);
      }
    }
  }

  for (const status of TODOS) {
    assert.ok(visitados.has(status), `${status} é inalcançável a partir de draft`);
  }
});
