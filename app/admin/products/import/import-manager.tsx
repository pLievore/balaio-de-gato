'use client';

import { useState, useTransition } from 'react';

import { PRODUCT_ATTRIBUTES } from '../../../../src/lib/catalog/attributes';
import { cn } from '../../../../src/lib/cn';
import type { ProductAttributes } from '../../../../src/lib/panel/products';
import {
  applyImportAction,
  previewImportAction,
  type ImportPreviewRow,
  type ImportRow,
} from '../actions';

/** Minimal CSV parser with quoted-field support. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function toImportRows(csv: string[][]): { rows?: ImportRow[]; error?: string } {
  if (csv.length < 2) return { error: 'The file has no data rows.' };

  // Excel writes a UTF-8 BOM into the first header cell; strip it or the
  // first column never matches.
  const header = csv[0].map((cell) => cell.replace(/^﻿/, '').trim().toLowerCase());
  const columnOf = (name: string) => header.indexOf(name);

  const variantIndex = columnOf('variant_id');
  const skuIndex = columnOf('sku');
  if (variantIndex === -1 && skuIndex === -1) {
    return { error: 'The file needs a variant_id or an sku column.' };
  }

  const titleIndex = columnOf('product_title');
  const descriptionIndex = columnOf('description');
  const priceIndex = columnOf('price');
  const compareIndex = columnOf('compare_at_price');
  const quantityIndex = columnOf('quantity');
  const attributeIndexes = PRODUCT_ATTRIBUTES.map((attribute) => ({
    key: attribute.key,
    index: columnOf(attribute.key),
  }));

  const editable = [
    titleIndex,
    descriptionIndex,
    priceIndex,
    compareIndex,
    quantityIndex,
    ...attributeIndexes.map((attribute) => attribute.index),
  ].some((index) => index !== -1);
  if (!editable) {
    return {
      error:
        'Nothing to import: include at least one of product_title, description, price, compare_at_price, quantity, or an attribute column.',
    };
  }

  const cellAt = (line: string[], index: number) =>
    index === -1 ? undefined : (line[index] ?? '').trim();

  const rows: ImportRow[] = [];
  for (const line of csv.slice(1)) {
    const variantId = cellAt(line, variantIndex) ?? '';
    const sku = cellAt(line, skuIndex);
    const title = cellAt(line, titleIndex);

    // A row with no key and no title carries nothing we can act on.
    if (!variantId && !sku && !title) continue;

    const row: ImportRow = { variantId };
    if (sku !== undefined) row.sku = sku;
    if (title !== undefined) row.title = title;
    if (descriptionIndex !== -1) {
      row.description = line[descriptionIndex] ?? '';
    }
    if (priceIndex !== -1 && cellAt(line, priceIndex) !== '') {
      row.price = cellAt(line, priceIndex);
    }
    if (compareIndex !== -1) row.compareAtPrice = cellAt(line, compareIndex);
    if (quantityIndex !== -1 && cellAt(line, quantityIndex) !== '') {
      row.quantity = Number(cellAt(line, quantityIndex));
    }

    const attributes: ProductAttributes = {};
    for (const attribute of attributeIndexes) {
      if (attribute.index === -1) continue;
      attributes[attribute.key] = line[attribute.index] ?? '';
    }
    if (Object.keys(attributes).length > 0) row.attributes = attributes;

    rows.push(row);
  }

  return { rows };
}

export function ImportManager() {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = (file: File | undefined) => {
    setError(null);
    setPreview(null);
    setRows(null);
    setDone(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = toImportRows(parseCsv(String(reader.result ?? '')));
      if (parsed.error || !parsed.rows) {
        setError(parsed.error ?? 'Could not read the file.');
        return;
      }
      setRows(parsed.rows);
      startTransition(async () => {
        const result = await previewImportAction(parsed.rows!);
        if (!result.ok || !result.preview) {
          setError(result.error ?? 'Preview failed.');
          return;
        }
        setPreview(result.preview);
      });
    };
    reader.readAsText(file);
  };

  const apply = () => {
    if (!rows) return;
    setError(null);
    startTransition(async () => {
      const result = await applyImportAction(rows);
      if (!result.ok) {
        setError(result.error ?? 'Import failed.');
        return;
      }
      setDone(result.applied ?? 0);
      setPreview(null);
      setRows(null);
    });
  };

  const created = preview?.filter((row) => row.valid && row.action === 'create') ?? [];
  const updated = preview?.filter((row) => row.valid && row.action === 'update') ?? [];
  const changed = [...created, ...updated];
  const invalid = preview?.filter((row) => !row.valid) ?? [];
  const unchanged = (preview?.length ?? 0) - changed.length - invalid.length;

  return (
    <div className="max-w-3xl space-y-5">
      <label className="block rounded-3xl border-2 border-dashed border-[rgb(var(--border-strong))] bg-white px-6 py-10 text-center text-sm text-[rgb(var(--muted))] transition hover:border-[rgb(var(--fg))]">
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <span className="font-semibold text-[rgb(var(--fg))]">Choose a CSV file</span> or drop it
        here
      </label>

      {pending ? <p className="text-sm text-[rgb(var(--muted))]">Working…</p> : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent-soft))] px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      {done !== null ? (
        <p
          role="status"
          className="rounded-xl border border-[rgb(var(--sage))]/50 bg-[rgb(var(--sage-soft))] px-4 py-3 text-sm font-semibold text-[rgb(var(--sage-ink))]"
        >
          Import applied: {done} {done === 1 ? 'change' : 'changes'}.
        </p>
      ) : null}

      {preview ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5">
          <h2 className="text-sm font-bold">Review before applying</h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            {created.length} new · {updated.length} updated · {unchanged} unchanged ·{' '}
            {invalid.length} invalid
          </p>

          {created.length > 0 ? (
            <p className="mt-3 rounded-xl bg-[rgb(var(--sage-soft))] px-4 py-2.5 text-xs text-[rgb(var(--sage-ink))]">
              New products are created as <strong>drafts</strong>. Add their photos and publish them
              from the products list when they are ready.
            </p>
          ) : null}

          {invalid.length > 0 ? (
            <ul className="mt-4 space-y-1 text-xs text-[rgb(var(--accent))]">
              {invalid.map((row) => (
                <li key={row.key}>
                  <strong>{row.label}</strong>: {row.error}
                </li>
              ))}
            </ul>
          ) : null}

          {changed.length > 0 ? (
            <ul className="mt-4 divide-y divide-[rgb(var(--border))] text-sm">
              {changed.map((row) => (
                <li key={row.key} className="py-2.5">
                  <p className="font-semibold">
                    {row.action === 'create' ? (
                      <span className="mr-2 rounded-full bg-[rgb(var(--sage-ink))] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                        New
                      </span>
                    ) : null}
                    {row.label}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted))]">{row.changes.join(' · ')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">
              Nothing to change — the file matches the store.
            </p>
          )}

          <button
            type="button"
            onClick={apply}
            disabled={pending || changed.length === 0 || invalid.length > 0}
            className={cn(
              'mt-5 min-h-11 rounded-full px-6 text-sm font-semibold transition',
              changed.length > 0 && invalid.length === 0
                ? 'bg-[rgb(var(--fg))] text-white hover:bg-[rgb(var(--fg))]/90'
                : 'border border-[rgb(var(--border))] text-[rgb(var(--muted))]',
              pending && 'opacity-60',
            )}
          >
            {pending
              ? 'Applying…'
              : `Apply ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
