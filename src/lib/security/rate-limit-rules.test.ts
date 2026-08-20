import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RATE_LIMITS,
  rateLimitBucket,
  requestIdentifier,
  secondsUntilNextWindow,
  windowStartFor,
} from './rate-limit-rules';

// ─── janelas ────────────────────────────────────────────────────────────────

test('a janela é alinhada ao relógio, não ao primeiro acesso', () => {
  // Duas instâncias que recebem o mesmo minuto precisam somar na mesma linha.
  const a = windowStartFor(new Date('2026-03-10T14:07:03.500Z'), 60);
  const b = windowStartFor(new Date('2026-03-10T14:07:59.900Z'), 60);
  assert.equal(a.toISOString(), b.toISOString());
  assert.equal(a.toISOString(), '2026-03-10T14:07:00.000Z');
});

test('janelas maiores agrupam períodos maiores', () => {
  const start = windowStartFor(new Date('2026-03-10T14:07:03Z'), 600);
  assert.equal(start.toISOString(), '2026-03-10T14:00:00.000Z');
});

test('o tempo de espera nunca é zero nem passa da janela', () => {
  const inicio = secondsUntilNextWindow(new Date('2026-03-10T14:00:00.000Z'), 60);
  const fim = secondsUntilNextWindow(new Date('2026-03-10T14:00:59.999Z'), 60);
  assert.equal(inicio, 60);
  assert.equal(fim, 1);
});

// ─── balde ──────────────────────────────────────────────────────────────────

test('o balde é hexadecimal de 64 caracteres, como a coluna exige', () => {
  assert.match(rateLimitBucket('checkout', '203.0.113.7'), /^[0-9a-f]{64}$/);
});

test('o balde não guarda o identificador em texto', () => {
  assert.ok(!rateLimitBucket('checkout', '203.0.113.7').includes('203'));
});

test('endereços diferentes caem em baldes diferentes', () => {
  assert.notEqual(
    rateLimitBucket('checkout', '203.0.113.7'),
    rateLimitBucket('checkout', '203.0.113.8'),
  );
});

test('o mesmo endereço em escopos diferentes não compartilha contagem', () => {
  assert.notEqual(
    rateLimitBucket('checkout', '203.0.113.7'),
    rateLimitBucket('events', '203.0.113.7'),
  );
});

// ─── identificação ──────────────────────────────────────────────────────────

test('usa o último endereço da cadeia de proxies, não o primeiro', () => {
  // Este teste afirmava o contrário e documentava uma falha: a primeira
  // entrada de `x-forwarded-for` é escrita por quem chama, então servia de
  // limite para ninguém. A última é a que o proxy mais próximo acrescentou.
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' });
  assert.equal(requestIdentifier(headers), '150.172.238.178');
});

test('cai para x-real-ip quando não há cadeia', () => {
  assert.equal(requestIdentifier(new Headers({ 'x-real-ip': '198.51.100.4' })), '198.51.100.4');
});

test('sem endereço, separa ao menos por agente', () => {
  const um = requestIdentifier(new Headers({ 'user-agent': 'curl/8.4.0' }));
  const outro = requestIdentifier(new Headers({ 'user-agent': 'curl/8.5.0' }));
  assert.match(um, /^ua:[0-9a-f]{32}$/);
  assert.notEqual(um, outro);
});

test('sem nada identificável, ainda devolve um balde', () => {
  assert.equal(requestIdentifier(new Headers()), 'anonymous');
});

// ─── regras ─────────────────────────────────────────────────────────────────

test('toda regra tem limite e janela positivos', () => {
  for (const [nome, regra] of Object.entries(RATE_LIMITS)) {
    assert.ok(regra.limit > 0, `${nome}: limite precisa ser positivo`);
    assert.ok(regra.windowSeconds > 0, `${nome}: janela precisa ser positiva`);
  }
});

test('o beacon de eventos é mais folgado que o checkout', () => {
  // Um pedido é raro; um evento de funil acontece a cada clique.
  assert.ok(RATE_LIMITS.events.limit > RATE_LIMITS.checkout.limit);
});

// ─── Identificação da origem ─────────────────────────────────────────────────

test('ignora o x-forwarded-for forjado pelo cliente e usa o cabeçalho da plataforma', () => {
  // A primeira entrada de `x-forwarded-for` é escrita por quem chama. Trocá-la
  // a cada requisição zerava o limite do login do painel e da consulta de
  // pedido; o balde tem de vir do que só a plataforma escreve.
  const headers = new Headers({
    'x-forwarded-for': '1.1.1.1, 203.0.113.7',
    'x-vercel-forwarded-for': '203.0.113.7',
  });
  assert.equal(requestIdentifier(headers), '203.0.113.7');
});

test('sem cabeçalho da plataforma, fica com a última entrada — a que o proxy pôs', () => {
  const forjado = new Headers({ 'x-forwarded-for': 'sou-quem-eu-quiser, 203.0.113.7' });
  assert.equal(requestIdentifier(forjado), '203.0.113.7');

  const outro = new Headers({ 'x-forwarded-for': 'outro-valor-qualquer, 203.0.113.7' });
  assert.equal(requestIdentifier(outro), requestIdentifier(forjado));
});

test('x-real-ip vale mais que a lista encaminhada', () => {
  const headers = new Headers({
    'x-forwarded-for': '1.1.1.1, 2.2.2.2',
    'x-real-ip': '203.0.113.9',
  });
  assert.equal(requestIdentifier(headers), '203.0.113.9');
});

test('sem endereço nenhum, agrupa pelo agente e nunca devolve vazio', () => {
  assert.equal(requestIdentifier(new Headers()), 'anonymous');
  const comAgente = requestIdentifier(new Headers({ 'user-agent': 'curl/8' }));
  assert.match(comAgente, /^ua:[0-9a-f]{32}$/);
});
