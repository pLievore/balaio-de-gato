import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectFieldErrors, orderFormSchema } from './schema';

const VALIDO = {
  responsavelNome: 'Maria Aparecida Souza',
  responsavelCpf: '529.982.247-25',
  email: 'maria@exemplo.com',
  telefone: '(11) 95555-1234',
  estudanteNome: 'João Souza',
  etapa: 'alfabetizacao',
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  numero: '1000',
  complemento: 'Apto 52',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'sp',
  observacoes: '',
  aceiteRegras: 'on',
};

function parse(overrides: Record<string, unknown> = {}) {
  return orderFormSchema.safeParse({ ...VALIDO, ...overrides });
}

function errorFor(field: string, overrides: Record<string, unknown>) {
  const result = parse(overrides);
  assert.equal(result.success, false, `esperava falha em ${field}`);
  if (result.success) throw new Error('inalcançável');
  return collectFieldErrors(result.error)[field as never] as string | undefined;
}

test('aceita um pedido completo e normaliza os campos', () => {
  const result = parse();
  assert.equal(result.success, true);
  if (!result.success) return;

  // A máscara sai; o servidor guarda só os dígitos.
  assert.equal(result.data.responsavelCpf, '52998224725');
  assert.equal(result.data.telefone, '11955551234');
  assert.equal(result.data.cep, '01310100');
  // A sigla do estado sobe para maiúscula sozinha.
  assert.equal(result.data.uf, 'SP');
});

// ─── Regra do programa: entrega não vai para endereço institucional ─────────

test('recusa entrega em escola, DRE ou unidade da SME', () => {
  for (const logradouro of [
    'Rua da EMEF Paulo Freire',
    'Avenida EMEI Jardim das Flores',
    'Rua do CEU Butantã',
    'Praça da DRE Pirituba',
    'Rua da Secretaria Municipal de Educação',
    'Travessa da Escola Estadual',
    'Rua da Creche Municipal',
  ]) {
    const message = errorFor('logradouro', { logradouro });
    assert.match(
      message ?? '',
      /não pode ser feita em escola/,
      `"${logradouro}" deveria ser recusado`
    );
  }
});

test('a recusa não pega endereço residencial comum', () => {
  for (const logradouro of [
    'Avenida Paulista',
    'Rua Escolástica Nunes',
    'Rua Doutor Ceumar Alves',
    'Alameda dos Anjos',
  ]) {
    assert.equal(parse({ logradouro }).success, true, `"${logradouro}" deveria passar`);
  }
});

// ─── Responsável ────────────────────────────────────────────────────────────

test('exige nome e sobrenome do responsável', () => {
  assert.match(errorFor('responsavelNome', { responsavelNome: 'Maria' }) ?? '', /sobrenome/);
});

test('recusa CPF com dígito verificador inválido', () => {
  assert.match(errorFor('responsavelCpf', { responsavelCpf: '111.111.111-11' }) ?? '', /Confira o CPF/);
});

test('recusa e-mail malformado', () => {
  assert.ok(errorFor('email', { email: 'maria@' }));
});

test('recusa telefone sem DDD', () => {
  assert.match(errorFor('telefone', { telefone: '95551234' }) ?? '', /DDD/);
});

// ─── Estudante e etapa ──────────────────────────────────────────────────────

test('recusa etapa que não existe no programa', () => {
  assert.ok(errorFor('etapa', { etapa: 'faculdade' }));
});

test('aceita todas as etapas publicadas', () => {
  for (const etapa of [
    'bercario',
    'mini-grupo',
    'infantil',
    'alfabetizacao',
    'interdisciplinar',
    'autoral',
    'ensino-medio',
    'eja-mova',
    'celps',
  ]) {
    assert.equal(parse({ etapa }).success, true, `${etapa} deveria ser aceita`);
  }
});

// ─── Endereço ───────────────────────────────────────────────────────────────

test('recusa CEP com quantidade errada de dígitos', () => {
  assert.match(errorFor('cep', { cep: '0131-10' }) ?? '', /8 dígitos/);
});

test('exige a sigla do estado com duas letras', () => {
  assert.ok(errorFor('uf', { uf: 'São Paulo' }));
});

test('complemento é opcional', () => {
  assert.equal(parse({ complemento: '' }).success, true);
});

// ─── Aceite ─────────────────────────────────────────────────────────────────

test('não envia sem a confirmação das regras', () => {
  assert.match(errorFor('aceiteRegras', { aceiteRegras: false }) ?? '', /confirmar as regras/);
});

test('coleta um erro por campo, e não uma lista repetida', () => {
  const result = parse({ responsavelNome: 'X', email: 'nada', cep: '1' });
  assert.equal(result.success, false);
  if (result.success) return;

  const errors = collectFieldErrors(result.error);
  assert.equal(Object.keys(errors).length, 3);
  assert.ok(errors.responsavelNome && errors.email && errors.cep);
});

// ─── Segurança: o formulário não pode aprender a pedir segredo ──────────────

test('o esquema não aceita senha nem código do cartão', () => {
  // Se alguém adicionar um destes campos, este teste cai — é a regra do
  // programa virada em trava, não uma preferência de interface.
  const proibidos = ['senha', 'password', 'codigoCartao', 'cartao', 'cvv', 'pin'];
  const campos = Object.keys(orderFormSchema.shape);

  for (const proibido of proibidos) {
    assert.ok(
      !campos.some((campo) => campo.toLowerCase().includes(proibido.toLowerCase())),
      `o formulário de pedido não pode ter o campo "${proibido}"`
    );
  }
});
