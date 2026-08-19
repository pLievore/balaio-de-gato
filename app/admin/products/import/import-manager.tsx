'use client';

import { CircleAlert, CircleCheck, FileUp, Loader2, TriangleAlert, Upload } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { applyImportAction, previewImportAction, type ImportState } from './actions';
import { CSV_COLUMNS } from '../../../../src/lib/panel/csv';
import { formatBRL } from '../../../../src/lib/money';

const INICIAL: ImportState = { status: 'idle' };

export function ImportManager() {
  const [preview, previewAction, analisando] = useActionState(previewImportAction, INICIAL);
  const [aplicacao, applyAction, aplicando] = useActionState(applyImportAction, INICIAL);

  // Depois de aplicar, o resultado manda na tela; antes disso, a prévia.
  const estado = aplicacao.status === 'idle' ? preview : aplicacao;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
        <h2 className="text-sm font-extrabold">1. Envie a planilha</h2>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
          Nada é gravado neste passo. Você confere o que entraria e só então aplica.
          Aceita vírgula ou ponto e vírgula como separador — o formato que o
          Excel em português exporta funciona direto.
        </p>

        <form action={previewAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block text-xs file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-[rgb(var(--border-strong))] file:bg-white file:px-5 file:text-xs file:font-bold"
          />
          <button
            type="submit"
            disabled={analisando}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {analisando ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <FileUp aria-hidden="true" className="size-4" />
            )}
            Conferir arquivo
          </button>
          <Link
            href="/admin/products/export"
            className="text-xs font-bold text-[rgb(var(--accent))] underline underline-offset-4"
          >
            Baixar o catálogo atual como modelo
          </Link>
        </form>

        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-bold">Colunas aceitas</summary>
          <ul className="mt-3 grid gap-1 text-[11px] text-[rgb(var(--muted))] sm:grid-cols-3">
            {CSV_COLUMNS.map((coluna) => (
              <li key={coluna} className="font-mono">
                {coluna}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-4 text-[rgb(var(--muted))]">
            Obrigatórias: slug, sku, nome, marca, categoria, preco e etapas. As
            etapas e as palavras-chave vão separadas por barra vertical
            (<code>alfabetizacao|autoral</code>).
          </p>
        </details>
      </section>

      {estado.status === 'error' ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {estado.message}
        </p>
      ) : null}

      {estado.status === 'preview' ? (
        <section className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
          <h2 className="text-sm font-extrabold">
            2. Confira — {estado.rows.length}{' '}
            {estado.rows.length === 1 ? 'linha entra' : 'linhas entram'}
          </h2>

          {estado.issues.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-start gap-2 text-xs font-bold text-amber-900">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {estado.issues.length}{' '}
                {estado.issues.length === 1 ? 'linha será ignorada' : 'linhas serão ignoradas'}
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] leading-4 text-amber-900">
                {estado.issues.map((problema, index) => (
                  <li key={index}>
                    Linha {problema.line}, coluna <strong>{problema.column}</strong>:{' '}
                    {problema.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-[rgb(var(--border))]">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="sticky top-0 bg-[rgb(var(--surface-muted))]">
                <tr className="text-left font-bold text-[rgb(var(--muted))]">
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2 text-right">Preço</th>
                  <th className="px-3 py-2 text-right">Estoque</th>
                  <th className="px-3 py-2">Etapas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {estado.rows.map((linha) => (
                  <tr key={linha.slug}>
                    <td className="px-3 py-2">
                      <span className="block font-semibold">{linha.name}</span>
                      <span className="block font-mono text-[10px] text-[rgb(var(--muted))]">
                        {linha.slug} · {linha.sku}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[rgb(var(--muted))]">{linha.categorySlug}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">
                      {formatBRL(linha.priceCents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{linha.stock}</td>
                    <td className="px-3 py-2 text-[10px] text-[rgb(var(--muted))]">
                      {linha.stageSlugs.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={applyAction} className="mt-5">
            <input type="hidden" name="payload" value={estado.payload} />
            <button
              type="submit"
              disabled={aplicando}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-6 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {aplicando ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Upload aria-hidden="true" className="size-4" />
              )}
              Aplicar {estado.rows.length}{' '}
              {estado.rows.length === 1 ? 'linha' : 'linhas'}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-[rgb(var(--muted))]">
              Produtos com endereço já existente são atualizados; os demais são
              criados. O estoque entra como movimento registrado.
            </p>
          </form>
        </section>
      ) : null}

      {estado.status === 'applied' ? (
        <section className="rounded-3xl border border-[rgb(var(--sage))]/30 bg-[rgb(var(--sage-soft))] p-6">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[rgb(var(--sage-ink))]">
            <CircleCheck aria-hidden="true" className="size-4" />
            Importação concluída
          </h2>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--sage-ink))]">
            {estado.created} {estado.created === 1 ? 'produto criado' : 'produtos criados'} ·{' '}
            {estado.updated} {estado.updated === 1 ? 'atualizado' : 'atualizados'}
          </p>

          {estado.failed.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-red-800">
                {estado.failed.length}{' '}
                {estado.failed.length === 1 ? 'linha falhou' : 'linhas falharam'} ao gravar:
              </p>
              <ul className="mt-2 space-y-1 text-[11px] leading-4 text-red-800">
                {estado.failed.map((falha) => (
                  <li key={falha.slug}>
                    <strong className="font-mono">{falha.slug}</strong>: {falha.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link
            href="/admin/products"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold transition hover:opacity-90"
          >
            Ver os produtos
          </Link>
        </section>
      ) : null}
    </div>
  );
}
