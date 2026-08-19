import { hasValidPanelSession } from '../../../../src/lib/panel/session';
import { exportCatalogRows } from '../../../../src/lib/panel/catalog-write';
import { toCsv, type CsvColumn } from '../../../../src/lib/panel/csv';

export const dynamic = 'force-dynamic';

/**
 * Catálogo em CSV.
 *
 * Sai com ponto e vírgula: é o separador que o Excel em português espera, e o
 * preço em real leva vírgula. Com vírgula como separador, abrir o arquivo no
 * Excel quebraria as colunas de preço.
 */
export async function GET() {
  if (!(await hasValidPanelSession())) {
    return new Response('Não autorizado', { status: 401 });
  }

  const rows = await exportCatalogRows();
  const real = (cents: number | null) =>
    cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',');

  const csv = toCsv(
    rows.map(
      (row) =>
        ({
          slug: row.slug,
          sku: row.sku ?? '',
          nome: row.name,
          marca: row.brand,
          linha_de_apoio: row.tagline,
          descricao: row.description,
          categoria: row.categorySlug ?? '',
          situacao: row.status,
          ilustracao: row.illustrationKey ?? '',
          preco: real(row.priceCents ?? 0),
          preco_anterior: real(row.compareAtPriceCents),
          limite_por_pedido: String(row.maxPerOrder ?? 1),
          estoque: String(row.onHand ?? 0),
          etapas: row.stageSlugs.join('|'),
          palavras_chave: row.keywords.join('|'),
        }) satisfies Record<CsvColumn, string>,
    ),
    ';',
  );

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="balaio-catalogo-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
