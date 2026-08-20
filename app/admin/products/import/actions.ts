'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { CATALOG_CACHE_TAG } from '../../../../src/lib/catalog/repository';
import { hasValidPanelSession } from '../../../../src/lib/panel/session';
import { applyImportRows } from '../../../../src/lib/panel/catalog-write';
import { previewImport, type ImportIssue, type ImportRow } from '../../../../src/lib/panel/csv';

export type ImportState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | {
      status: 'preview';
      rows: ImportRow[];
      issues: ImportIssue[];
      payload: string;
    }
  | {
      status: 'applied';
      created: number;
      updated: number;
      failed: { slug: string; message: string }[];
    };

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * Lê a planilha e mostra o que entraria, sem gravar nada.
 *
 * A conferência é o ponto do fluxo: um import aplicado direto pode reescrever
 * preço de todo o catálogo por causa de uma coluna trocada.
 */
export async function previewImportAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (!(await hasValidPanelSession())) {
    return { status: 'error', message: 'Sessão expirada. Entre novamente no painel.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Escolha um arquivo CSV.' };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { status: 'error', message: 'O arquivo passa de 2 MB.' };
  }

  const text = await file.text();
  const preview = previewImport(text);

  if (preview.missingColumns.length > 0) {
    return {
      status: 'error',
      message: `Faltam colunas obrigatórias: ${preview.missingColumns.join(', ')}.`,
    };
  }
  if (preview.rows.length === 0) {
    return {
      status: 'error',
      message: 'Nenhuma linha aproveitável. Corrija os problemas e envie de novo.',
    };
  }

  return {
    status: 'preview',
    rows: preview.rows,
    issues: preview.issues,
    // As linhas conferidas seguem para o passo de aplicar sem reenviar o
    // arquivo — o que a pessoa aprovou é exatamente o que será gravado.
    payload: JSON.stringify(preview.rows),
  };
}

export async function applyImportAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (!(await hasValidPanelSession())) {
    return { status: 'error', message: 'Sessão expirada. Entre novamente no painel.' };
  }

  const raw = formData.get('payload');
  if (typeof raw !== 'string' || raw.length === 0) {
    return { status: 'error', message: 'Nada para aplicar. Refaça a pré-visualização.' };
  }

  let rows: ImportRow[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('vazio');
    rows = parsed as ImportRow[];
  } catch {
    return { status: 'error', message: 'Não foi possível ler as linhas conferidas.' };
  }

  const result = await applyImportRows(rows);

  // Uma planilha mexe em preço e estoque de muitos produtos de uma vez; é o
  // caso em que o catálogo em cache mais destoa do banco.
  revalidateTag(CATALOG_CACHE_TAG, 'max');
  revalidatePath('/admin/products');
  revalidatePath('/products');

  return {
    status: 'applied',
    created: result.created,
    updated: result.updated,
    failed: result.failed,
  };
}
