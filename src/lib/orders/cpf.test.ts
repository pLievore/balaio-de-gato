import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatCEP,
  formatCPF,
  formatPhone,
  isValidCEP,
  isValidCPF,
  isValidPhone,
  maskCPF,
  stripCPF,
} from './cpf';

// Números com dígito verificador correto, gerados só para teste.
const CPF_VALIDO = '52998224725';
const OUTRO_CPF_VALIDO = '11144477735';

test('aceita CPF com dígito verificador correto', () => {
  assert.equal(isValidCPF(CPF_VALIDO), true);
  assert.equal(isValidCPF(OUTRO_CPF_VALIDO), true);
});

test('aceita o CPF já formatado', () => {
  assert.equal(isValidCPF('529.982.247-25'), true);
});

test('recusa CPF com dígito verificador errado', () => {
  assert.equal(isValidCPF('52998224724'), false);
  assert.equal(isValidCPF('11144477736'), false);
});

test('recusa sequência de dígitos repetidos, que passa na conta mas não existe', () => {
  for (const digit of '0123456789') {
    assert.equal(isValidCPF(digit.repeat(11)), false, `${digit.repeat(11)} deveria ser inválido`);
  }
});

test('recusa CPF com quantidade errada de dígitos', () => {
  assert.equal(isValidCPF('5299822472'), false);
  assert.equal(isValidCPF('529982247251'), false);
  assert.equal(isValidCPF(''), false);
});

test('remove tudo que não é dígito', () => {
  assert.equal(stripCPF('529.982.247-25'), CPF_VALIDO);
  assert.equal(stripCPF(' 529 982 247 25 '), CPF_VALIDO);
});

test('formata o CPF conforme o visitante digita', () => {
  assert.equal(formatCPF('529'), '529');
  assert.equal(formatCPF('529982'), '529.982');
  assert.equal(formatCPF('529982247'), '529.982.247');
  assert.equal(formatCPF(CPF_VALIDO), '529.982.247-25');
});

test('a formatação descarta dígitos além do décimo primeiro', () => {
  assert.equal(formatCPF('529982247259999'), '529.982.247-25');
});

test('a máscara esconde o documento e mantém só o miolo', () => {
  assert.equal(maskCPF(CPF_VALIDO), '***.982.***-**');
  assert.equal(maskCPF('123'), '***.***.***-**');
});

test('valida e formata o CEP', () => {
  assert.equal(isValidCEP('01310100'), true);
  assert.equal(isValidCEP('01310-100'), true);
  assert.equal(isValidCEP('0131010'), false);
  assert.equal(formatCEP('01310100'), '01310-100');
  assert.equal(formatCEP('013'), '013');
});

test('valida telefone fixo e celular', () => {
  assert.equal(isValidPhone('1155551234'), true);
  assert.equal(isValidPhone('11955551234'), true);
  assert.equal(isValidPhone('119555512'), false);
});

test('formata celular com nove dígitos e fixo com oito', () => {
  assert.equal(formatPhone('11955551234'), '(11) 95555-1234');
  assert.equal(formatPhone('1155551234'), '(11) 5555-1234');
  assert.equal(formatPhone('11'), '11');
});
