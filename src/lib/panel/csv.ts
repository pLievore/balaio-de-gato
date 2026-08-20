/**
 * CSV do catálogo.
 *
 * Módulo puro, para poder ser testado sem banco. O leitor é deliberadamente
 * conservador: prefere recusar uma linha com aviso claro a adivinhar o que
 * quem preencheu quis dizer — um palpite errado aqui vira preço errado na
 * loja.
 */

import { CATEGORIES } from '../catalog/categories';
import { EDUCATION_STAGES } from '../program/material-escolar';
import { parsePriceToCents } from './product-form';

export const CSV_COLUMNS = [
  'slug',
  'sku',
  'nome',
  'marca',
  'linha_de_apoio',
  'descricao',
  'categoria',
  'situacao',
  'ilustracao',
  'preco',
  'preco_anterior',
  'limite_por_pedido',
  'estoque',
  'etapas',
  'palavras_chave',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

const CATEGORY_SLUGS = new Set<string>(CATEGORIES.map((category) => category.slug));
const STAGE_SLUGS = new Set<string>(EDUCATION_STAGES.map((stage) => stage.slug));
const STATUSES = new Set(['draft', 'active', 'archived']);

/** Escapa um campo. Separador, aspas e quebra de linha exigem aspas duplas. */
function escapeField(value: string, delimiter: ',' | ';' = ','): string {
  const needsQuotes = value.includes(delimiter) || /["\n\r]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: Record<CsvColumn, string>[], delimiter: ',' | ';' = ','): string {
  const header = CSV_COLUMNS.join(delimiter);
  const body = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeField(row[col] ?? '', delimiter)).join(delimiter),
  );
  // BOM: sem ele o Excel abre os acentos errados no Windows.
  return '\uFEFF' + [header, ...body].join('\r\n') + '\r\n';
}

/**
 * Descobre o separador olhando o cabeçalho.
 *
 * O Excel em português exporta com ponto e vírgula, justamente porque o número
 * decimal usa vírgula. Aceitar os dois evita que a planilha que a loja tem em
 * mãos precise ser convertida antes de subir.
 */
export function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

/**
 * Divide o CSV respeitando aspas. Não usa `split()` porque descrição e preço
 * costumam conter o próprio separador.
 */
export function parseCsv(text: string, delimiter: ',' | ';' = detectDelimiter(text)): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''));
}

export type ImportRow = {
  line: number;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  tagline: string;
  description: string;
  categorySlug: string;
  status: 'draft' | 'active' | 'archived';
  illustrationKey: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  maxPerOrder: number;
  stock: number;
  stageSlugs: string[];
  keywords: string[];
};

export type ImportIssue = { line: number; column: string; message: string };

export type ImportPreview = {
  rows: ImportRow[];
  issues: ImportIssue[];
  missingColumns: string[];
};

/**
 * Lê e valida o arquivo inteiro antes de gravar qualquer coisa.
 *
 * Devolve as linhas boas e os problemas separados, para a tela mostrar o que
 * vai entrar e o que será ignorado — a conferência antes de aplicar é o que
 * evita um import destruir o catálogo.
 */
export function previewImport(text: string): ImportPreview {
  const delimiter = detectDelimiter(text);
  const table = parseCsv(text, delimiter);
  if (table.length === 0) {
    return { rows: [], issues: [], missingColumns: [...CSV_COLUMNS] };
  }

  const header = table[0]!.map((cell) => cell.trim().toLowerCase());
  const index = new Map(header.map((name, position) => [name, position]));

  // Colunas realmente indispensáveis. As demais têm padrão sensato.
  const required: CsvColumn[] = ['slug', 'sku', 'nome', 'marca', 'categoria', 'preco', 'etapas'];
  const missingColumns = required.filter((column) => !index.has(column));
  if (missingColumns.length > 0) return { rows: [], issues: [], missingColumns };

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seenSlugs = new Set<string>();

  for (let i = 1; i < table.length; i += 1) {
    const line = i + 1;
    const cells = table[i]!;
    const get = (column: CsvColumn): string => {
      const position = index.get(column);
      return position === undefined ? '' : (cells[position] ?? '').trim();
    };

    const slug = get('slug').toLowerCase();
    const sku = get('sku');
    const name = get('nome');
    const problems: ImportIssue[] = [];

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      problems.push({
        line,
        column: 'slug',
        message: 'Endereço inválido (use minúsculas e hífens).',
      });
    } else if (seenSlugs.has(slug)) {
      problems.push({ line, column: 'slug', message: 'Repetido no arquivo.' });
    }
    if (!sku) problems.push({ line, column: 'sku', message: 'Obrigatório.' });
    if (name.length < 3) problems.push({ line, column: 'nome', message: 'Obrigatório.' });

    const categorySlug = get('categoria').toLowerCase();
    if (!CATEGORY_SLUGS.has(categorySlug)) {
      problems.push({
        line,
        column: 'categoria',
        message: `Categoria desconhecida: "${categorySlug}".`,
      });
    }

    const priceCents = parsePriceToCents(get('preco'));
    if (priceCents === null) {
      problems.push({ line, column: 'preco', message: 'Preço inválido.' });
    } else if (priceCents === 0) {
      // Uma planilha inteira com a coluna de preço vazia ou zerada publicaria
      // o catálogo de graça. A conferência barra antes de gravar.
      problems.push({ line, column: 'preco', message: 'Preço não pode ser zero.' });
    }

    const rawCompare = get('preco_anterior');
    const compareAtPriceCents = rawCompare ? parsePriceToCents(rawCompare) : null;
    if (rawCompare && compareAtPriceCents === null) {
      problems.push({ line, column: 'preco_anterior', message: 'Preço anterior inválido.' });
    } else if (
      compareAtPriceCents !== null &&
      priceCents !== null &&
      compareAtPriceCents <= priceCents
    ) {
      problems.push({
        line,
        column: 'preco_anterior',
        message: 'Precisa ser maior que o preço.',
      });
    }

    // Com ponto e vírgula como separador de colunas, a lista interna precisa
    // usar barra vertical — senão a célula seria quebrada em duas.
    const listSeparator = delimiter === ';' ? /\|/ : /[;|]/;
    const stageSlugs = get('etapas')
      .split(listSeparator)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (stageSlugs.length === 0) {
      problems.push({ line, column: 'etapas', message: 'Informe ao menos uma etapa.' });
    }
    for (const stage of stageSlugs) {
      if (!STAGE_SLUGS.has(stage)) {
        problems.push({ line, column: 'etapas', message: `Etapa desconhecida: "${stage}".` });
      }
    }

    const rawStatus = get('situacao').toLowerCase() || 'draft';
    if (!STATUSES.has(rawStatus)) {
      problems.push({ line, column: 'situacao', message: 'Use draft, active ou archived.' });
    }

    const rawStock = get('estoque');
    const stock = rawStock === '' ? 0 : Number(rawStock);
    if (!Number.isInteger(stock) || stock < 0) {
      problems.push({ line, column: 'estoque', message: 'Use um inteiro não negativo.' });
    }

    const rawMax = get('limite_por_pedido');
    const maxPerOrder = rawMax === '' ? 5 : Number(rawMax);
    if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1) {
      problems.push({
        line,
        column: 'limite_por_pedido',
        message: 'Use um inteiro a partir de 1.',
      });
    }

    if (problems.length > 0) {
      issues.push(...problems);
      continue;
    }

    seenSlugs.add(slug);
    rows.push({
      line,
      slug,
      sku,
      name,
      brand: get('marca'),
      tagline: get('linha_de_apoio') || name,
      description: get('descricao') || name,
      categorySlug,
      status: rawStatus as ImportRow['status'],
      illustrationKey: get('ilustracao') || null,
      priceCents: priceCents!,
      compareAtPriceCents,
      maxPerOrder,
      stock,
      stageSlugs: [...new Set(stageSlugs)],
      keywords: get('palavras_chave')
        .split(listSeparator)
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
  }

  return { rows, issues, missingColumns: [] };
}
