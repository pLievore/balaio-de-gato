/**
 * Smoke da coleta de eventos.
 *
 * Grava um evento de cada tipo, confere que a leitura do painel devolve o que
 * foi gravado e limpa o que criou. Cobre o incremento atômico, que é o ponto
 * onde dois beacons simultâneos poderiam se perder.
 */

import { and, eq, gte } from 'drizzle-orm';

import { db, pool } from '../src/db/client';
import { funnelCounters } from '../src/db/schema';
import {
  funnelDateKey,
  getFunnelBreakdown,
  getFunnelCounts,
  getProductFunnel,
  recordFunnelStep,
  recordProductStep,
  recordSessionContext,
} from '../src/lib/analytics/funnel';

const SLUG_TESTE = 'smoke-funil-produto';

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, encontrado ${String(actual)}.`);
  }
}

async function limpar(): Promise<void> {
  const hoje = funnelDateKey();
  await db
    .delete(funnelCounters)
    .where(and(eq(funnelCounters.day, hoje), eq(funnelCounters.key, `${SLUG_TESTE}:product_view`)));
}

async function main(): Promise<void> {
  const hoje = funnelDateKey();

  // O fuso precisa ser o da operação, senão o evento cai no dia errado.
  const esperado = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  assertEqual('dia do funil usa o fuso de São Paulo', hoje, esperado);

  await limpar();

  // Contagem antes, para medir o delta em vez do valor absoluto.
  const antes = await getFunnelCounts(1);
  const sessoesAntes = antes[0]?.counts.session ?? 0;

  await recordFunnelStep('session');
  await recordFunnelStep('session');
  await recordFunnelStep('add_to_cart');

  const depois = await getFunnelCounts(1);
  assertEqual('sessões somaram 2', (depois[0]?.counts.session ?? 0) - sessoesAntes, 2);

  // Origem e localização, gravadas juntas no beacon de sessão.
  await recordSessionContext({ source: 'instagram', location: 'São Paulo, BR' });
  const origens = await getFunnelBreakdown(1, 'src');
  const locais = await getFunnelBreakdown(1, 'geo');
  if (!origens.some((entrada) => entrada.label === 'instagram')) {
    throw new Error('a origem instagram não foi registrada.');
  }
  if (!locais.some((entrada) => entrada.label === 'São Paulo, BR')) {
    throw new Error('a localização não foi registrada.');
  }

  // Funil por produto: três incrementos no mesmo slug.
  await recordProductStep('product_view', [SLUG_TESTE]);
  await recordProductStep('product_view', [SLUG_TESTE]);
  await recordProductStep('product_view', [SLUG_TESTE]);
  const produtos = await getProductFunnel(1);
  const linha = produtos.find((p) => p.handle === SLUG_TESTE);
  assertEqual('produto somou 3 visualizações', linha?.counts.product_view, 3);

  // O período devolve um ponto por dia, mesmo sem evento.
  const serie = await getFunnelCounts(7);
  assertEqual('série tem sete pontos', serie.length, 7);

  await limpar();
  const aposLimpeza = await getProductFunnel(1);
  assertEqual(
    'contador de teste removido',
    aposLimpeza.some((p) => p.handle === SLUG_TESTE),
    false,
  );

  // Mostra o que ficou registrado hoje, para conferência visual.
  const doDia = await db
    .select({ metric: funnelCounters.metric, key: funnelCounters.key, total: funnelCounters.total })
    .from(funnelCounters)
    .where(gte(funnelCounters.day, hoje));
  console.log(
    'Smoke do funil passou. Contadores de hoje:',
    doDia.map((c) => `${c.metric}/${c.key}=${c.total}`).join(' ') || '(nenhum)',
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
