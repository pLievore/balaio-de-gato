import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CSV_COLUMNS,
  detectDelimiter,
  parseCsv,
  previewImport,
  toCsv,
  type CsvColumn,
} from './csv';

const CABECALHO = CSV_COLUMNS.join(',');

function linha(overrides: Partial<Record<CsvColumn, string>> = {}): string {
  const base: Record<CsvColumn, string> = {
    slug: 'caderno-teste',
    sku: 'TST-01',
    nome: 'Caderno de teste',
    marca: 'Marca',
    linha_de_apoio: 'Apoio',
    descricao: 'Descrição',
    categoria: 'cadernos',
    situacao: 'active',
    ilustracao: 'caderno',
    preco: '14,90',
    preco_anterior: '',
    limite_por_pedido: '5',
    estoque: '10',
    etapas: 'alfabetizacao',
    palavras_chave: 'caderno;teste',
    ...overrides,
  };
  // O preço em português leva vírgula, então o campo precisa vir entre aspas —
  // é exatamente o que uma planilha real produz.
  return CSV_COLUMNS.map((c) => {
    const value = base[c];
    return value.includes(',') ? `"${value}"` : value;
  }).join(',');
}

/** A mesma linha, no formato que o Excel em português exporta. */
function linhaPontoEVirgula(overrides: Partial<Record<CsvColumn, string>> = {}): string {
  const base: Record<CsvColumn, string> = {
    slug: 'caderno-teste',
    sku: 'TST-01',
    nome: 'Caderno de teste',
    marca: 'Marca',
    linha_de_apoio: 'Apoio',
    descricao: 'Descrição',
    categoria: 'cadernos',
    situacao: 'active',
    ilustracao: 'caderno',
    preco: '14,90',
    preco_anterior: '',
    limite_por_pedido: '5',
    estoque: '10',
    etapas: 'alfabetizacao|autoral',
    palavras_chave: 'caderno|teste',
    ...overrides,
  };
  return CSV_COLUMNS.map((c) => base[c]).join(';');
}

// ─── leitor ─────────────────────────────────────────────────────────────────

test('respeita vírgula dentro de aspas', () => {
  const table = parseCsv('a,b\n"contém, vírgula",2');
  assert.deepEqual(table[1], ['contém, vírgula', '2']);
});

test('entende aspas escapadas por duplicação', () => {
  const table = parseCsv('a\n"ele disse ""oi"""');
  assert.deepEqual(table[1], ['ele disse "oi"']);
});

test('aceita quebra de linha do Windows e ignora linhas vazias', () => {
  const table = parseCsv('a,b\r\n1,2\r\n\r\n3,4\r\n');
  assert.equal(table.length, 3);
  assert.deepEqual(table[2], ['3', '4']);
});

test('descarta o BOM que o Excel escreve', () => {
  const table = parseCsv('﻿a,b\n1,2');
  assert.deepEqual(table[0], ['a', 'b']);
});

// ─── escrita ────────────────────────────────────────────────────────────────

test('a exportação escapa o que precisa e volta pelo leitor', () => {
  const csv = toCsv([
    Object.fromEntries(
      CSV_COLUMNS.map((c) => [c, c === 'descricao' ? 'tem, vírgula e "aspas"' : c]),
    ) as Record<CsvColumn, string>,
  ]);

  const table = parseCsv(csv);
  const pos = CSV_COLUMNS.indexOf('descricao');
  assert.equal(table[1]![pos], 'tem, vírgula e "aspas"');
});

// ─── validação ──────────────────────────────────────────────────────────────

test('aceita uma linha completa', () => {
  const preview = previewImport(`${CABECALHO}\n${linha()}`);
  assert.deepEqual(preview.issues, []);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0]?.priceCents, 1490);
  assert.deepEqual(preview.rows[0]?.stageSlugs, ['alfabetizacao']);
  assert.deepEqual(preview.rows[0]?.keywords, ['caderno', 'teste']);
});

test('avisa quando faltam colunas obrigatórias', () => {
  const preview = previewImport('slug,nome\ncaderno,Caderno');
  assert.ok(preview.missingColumns.includes('sku'));
  assert.ok(preview.missingColumns.includes('etapas'));
  assert.equal(preview.rows.length, 0);
});

test('recusa a linha e segue com as outras, em vez de abortar tudo', () => {
  const csv = [CABECALHO, linha({ slug: 'boa-1' }), linha({ slug: 'INVÁLIDO' }), linha({ slug: 'boa-2' })].join('\n');
  const preview = previewImport(csv);
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.issues.length, 1);
  assert.equal(preview.issues[0]?.column, 'slug');
});

test('acusa slug repetido no mesmo arquivo', () => {
  const csv = [CABECALHO, linha(), linha()].join('\n');
  const preview = previewImport(csv);
  assert.equal(preview.rows.length, 1);
  assert.match(preview.issues[0]?.message ?? '', /Repetido/);
});

test('recusa categoria e etapa desconhecidas', () => {
  const preview = previewImport(
    [CABECALHO, linha({ categoria: 'moveis', etapas: 'faculdade' })].join('\n'),
  );
  assert.equal(preview.rows.length, 0);
  const colunas = preview.issues.map((i) => i.column);
  assert.ok(colunas.includes('categoria'));
  assert.ok(colunas.includes('etapas'));
});

test('aceita várias etapas separadas por ponto e vírgula', () => {
  const preview = previewImport(
    [CABECALHO, linha({ etapas: 'alfabetizacao;autoral;ensino-medio' })].join('\n'),
  );
  assert.deepEqual(preview.rows[0]?.stageSlugs, ['alfabetizacao', 'autoral', 'ensino-medio']);
});

test('exige preço anterior maior que o preço', () => {
  const preview = previewImport(
    [CABECALHO, linha({ preco: '20,00', preco_anterior: '10,00' })].join('\n'),
  );
  assert.equal(preview.rows.length, 0);
  assert.match(preview.issues[0]?.message ?? '', /maior que o preço/);
});

test('recusa estoque negativo ou fracionado', () => {
  for (const estoque of ['-1', '2,5']) {
    const preview = previewImport([CABECALHO, linha({ estoque })].join('\n'));
    assert.equal(preview.rows.length, 0, `estoque "${estoque}" deveria falhar`);
  }
});

test('campos opcionais vazios recebem padrão em vez de quebrar', () => {
  const preview = previewImport(
    [CABECALHO, linha({ situacao: '', estoque: '', limite_por_pedido: '', linha_de_apoio: '' })].join('\n'),
  );
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0]?.status, 'draft');
  assert.equal(preview.rows[0]?.stock, 0);
  assert.equal(preview.rows[0]?.maxPerOrder, 5);
  // Sem linha de apoio, o nome serve — melhor que gravar string vazia.
  assert.equal(preview.rows[0]?.tagline, 'Caderno de teste');
});

test('a linha reportada corresponde à do arquivo, contando o cabeçalho', () => {
  const csv = [CABECALHO, linha({ slug: 'ok-1' }), linha({ slug: 'INVÁLIDO' })].join('\n');
  const preview = previewImport(csv);
  assert.equal(preview.issues[0]?.line, 3);
});

test('slug em maiúsculas é normalizado, não recusado', () => {
  // Quem exporta de uma planilha costuma mandar em caixa alta; corrigir é mais
  // útil que devolver o arquivo.
  const preview = previewImport([CABECALHO, linha({ slug: 'CADERNO-TESTE' })].join('\n'));
  assert.deepEqual(preview.issues, []);
  assert.equal(preview.rows[0]?.slug, 'caderno-teste');
});

test('arquivo vazio não explode', () => {
  const preview = previewImport('');
  assert.equal(preview.rows.length, 0);
  assert.ok(preview.missingColumns.length > 0);
});

// ─── separador ──────────────────────────────────────────────────────────────

test('detecta o separador pelo cabeçalho', () => {
  assert.equal(detectDelimiter('a,b,c\n1,2,3'), ',');
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
});

test('lê a planilha do Excel em português, com ponto e vírgula e preço com vírgula', () => {
  const csv = [CSV_COLUMNS.join(';'), linhaPontoEVirgula()].join('\n');
  const preview = previewImport(csv);

  assert.deepEqual(preview.issues, []);
  assert.equal(preview.rows.length, 1);
  // O preço não foi partido em duas colunas.
  assert.equal(preview.rows[0]?.priceCents, 1490);
  assert.deepEqual(preview.rows[0]?.stageSlugs, ['alfabetizacao', 'autoral']);
  assert.deepEqual(preview.rows[0]?.keywords, ['caderno', 'teste']);
});

test('a exportação com ponto e vírgula volta pelo leitor', () => {
  const linha = Object.fromEntries(
    CSV_COLUMNS.map((c) => [c, c === 'preco' ? '14,90' : c]),
  ) as Record<CsvColumn, string>;

  const csv = toCsv([linha], ';');
  const table = parseCsv(csv);
  assert.equal(table[1]![CSV_COLUMNS.indexOf('preco')], '14,90');
});
