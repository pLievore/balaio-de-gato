import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  MAINTENANCE_PATH,
  isMaintenanceEnabled,
  isPathAlwaysAllowed,
  matchesBypassToken,
} from './maintenance';

/**
 * O módulo lê `process.env` a cada chamada, então o teste troca a variável e
 * devolve o estado depois. Sem a limpeza, um teste contaminaria o seguinte.
 */
const ORIGINAL = {
  mode: process.env.MAINTENANCE_MODE,
  token: process.env.MAINTENANCE_BYPASS_TOKEN,
};

afterEach(() => {
  process.env.MAINTENANCE_MODE = ORIGINAL.mode;
  process.env.MAINTENANCE_BYPASS_TOKEN = ORIGINAL.token;
  if (ORIGINAL.mode === undefined) delete process.env.MAINTENANCE_MODE;
  if (ORIGINAL.token === undefined) delete process.env.MAINTENANCE_BYPASS_TOKEN;
});

test('aceita as grafias que uma pessoa realmente digita no painel da Vercel', () => {
  for (const spelling of ['1', 'true', 'on', 'TRUE', 'On', '  true  ']) {
    process.env.MAINTENANCE_MODE = spelling;
    assert.equal(isMaintenanceEnabled(), true, `esperava ligado para ${JSON.stringify(spelling)}`);
  }
});

test('só liga o portão com valor afirmativo — na dúvida, a loja fica no ar', () => {
  for (const spelling of ['', '0', 'false', 'off', 'no', 'sim', 'yes']) {
    process.env.MAINTENANCE_MODE = spelling;
    assert.equal(
      isMaintenanceEnabled(),
      false,
      `esperava desligado para ${JSON.stringify(spelling)}`,
    );
  }

  delete process.env.MAINTENANCE_MODE;
  assert.equal(isMaintenanceEnabled(), false);
});

test('o painel e a própria página de manutenção passam pelo portão', () => {
  // O painel, para a loja seguir sendo operada; a página, senão a reescrita
  // do proxy entraria em laço consigo mesma.
  assert.equal(isPathAlwaysAllowed('/admin'), true);
  assert.equal(isPathAlwaysAllowed('/admin/orders'), true);
  assert.equal(isPathAlwaysAllowed('/admin/products/caderno'), true);
  assert.equal(isPathAlwaysAllowed(MAINTENANCE_PATH), true);
});

test('o storefront inteiro fica atrás do portão', () => {
  for (const pathname of [
    '/',
    '/products',
    '/products/caderno',
    '/cart',
    '/checkout',
    '/pedido/BG-234567',
  ]) {
    assert.equal(isPathAlwaysAllowed(pathname), false, `esperava bloqueado: ${pathname}`);
  }
});

test('a liberação casa o segmento inteiro, não o começo do texto', () => {
  // Sem a checagem de fronteira, "/administrativo" herdaria a liberação de
  // "/admin" e vazaria uma rota pública com o portão ligado.
  assert.equal(isPathAlwaysAllowed('/administrativo'), false);
  assert.equal(isPathAlwaysAllowed('/admin-legado'), false);
  assert.equal(isPathAlwaysAllowed('/maintenance-antiga'), false);
});

test('sem token configurado o desvio não existe, mesmo com o valor certo na URL', () => {
  delete process.env.MAINTENANCE_BYPASS_TOKEN;
  assert.equal(matchesBypassToken('qualquer-coisa'), false);

  // String vazia é ausência de segredo, não um segredo vazio que casa com tudo.
  process.env.MAINTENANCE_BYPASS_TOKEN = '   ';
  assert.equal(matchesBypassToken(''), false);
  assert.equal(matchesBypassToken('   '), false);
});

test('o desvio exige o token exato', () => {
  process.env.MAINTENANCE_BYPASS_TOKEN = 'segredo-de-preview';

  assert.equal(matchesBypassToken('segredo-de-preview'), true);
  assert.equal(matchesBypassToken('segredo-de-previe'), false);
  assert.equal(matchesBypassToken('SEGREDO-DE-PREVIEW'), false);
  assert.equal(matchesBypassToken(undefined), false);
  assert.equal(matchesBypassToken(null), false);
});
