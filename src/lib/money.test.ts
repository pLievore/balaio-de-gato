import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatBRL, formatBRLValue, parseBRLToCents } from './money';

/**
 * O `Intl` separa "R$" do número com espaço não separável (U+00A0), não com
 * espaço comum. Comparar com " " falharia por um caractere invisível, então a
 * normalização acontece aqui e não no módulo — a página quer o U+00A0.
 */
function normalize(value: string): string {
  return value.replace(/ /g, ' ');
}

test('formata centavos como moeda brasileira, sempre com duas casas', () => {
  assert.equal(normalize(formatBRL(1000)), 'R$ 10,00');
  assert.equal(normalize(formatBRL(1290)), 'R$ 12,90');
  assert.equal(normalize(formatBRL(0)), 'R$ 0,00');
  assert.equal(normalize(formatBRL(5)), 'R$ 0,05');
});

test('agrupa milhar com ponto, como se escreve em português', () => {
  assert.equal(normalize(formatBRL(123456)), 'R$ 1.234,56');
  assert.equal(normalize(formatBRL(100000000)), 'R$ 1.000.000,00');
});

test('formatBRLValue tira o símbolo para a vitrine pôr o "R$" em outro peso', () => {
  assert.equal(formatBRLValue(1290), '12,90');
  assert.equal(formatBRLValue(123456), '1.234,56');
  assert.ok(!formatBRLValue(1000).includes('R$'));
});

test('lê o preço digitado com vírgula, com ponto ou com o símbolo junto', () => {
  assert.equal(parseBRLToCents('12,90'), 1290);
  assert.equal(parseBRLToCents('12.90'), 1290);
  assert.equal(parseBRLToCents('R$ 12,90'), 1290);
  assert.equal(parseBRLToCents('  12,90  '), 1290);
});

test('ponto antes de três dígitos é separador de milhar, não decimal', () => {
  assert.equal(parseBRLToCents('1.234,56'), 123456);
  assert.equal(parseBRLToCents('1.234.567,89'), 123456789);
  // Aqui o ponto é decimal: "90" não são três dígitos.
  assert.equal(parseBRLToCents('12.90'), 1290);
});

test('arredonda para o centavo inteiro mais próximo em vez de truncar', () => {
  // 19,99 × 100 dá 1998,9999... em ponto flutuante; truncar viraria R$ 19,98.
  assert.equal(parseBRLToCents('19,99'), 1999);
  assert.equal(parseBRLToCents('0,015'), 2);
  assert.equal(parseBRLToCents('0,014'), 1);
});

test('recusa o que não é preço, em vez de devolver zero', () => {
  assert.equal(parseBRLToCents(''), null);
  assert.equal(parseBRLToCents('R$'), null);
  assert.equal(parseBRLToCents('abc'), null);
  assert.equal(parseBRLToCents('12,90,10'), null);
});

test('recusa valor negativo: preço e total do pedido nunca descem de zero', () => {
  assert.equal(parseBRLToCents('-1'), null);
  assert.equal(parseBRLToCents('-12,90'), null);
});

test('o que entra formatado volta em centavos, sem perder um centavo no caminho', () => {
  for (const cents of [0, 5, 99, 1290, 123456, 999999999]) {
    assert.equal(parseBRLToCents(formatBRLValue(cents)), cents);
  }
});
