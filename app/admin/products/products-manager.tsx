'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, PencilLine } from 'lucide-react';

import type { PanelProduct } from '../../../src/lib/panel/products';
import { cn } from '../../../src/lib/cn';
import { saveProductAction } from './actions';

type VariantDraft = {
  price: string;
  compareAtPrice: string;
  quantity: string;
};

type ProductDraft = {
  status: PanelProduct['status'];
  variants: Record<string, VariantDraft>;
};

const STATUS_LABEL: Record<PanelProduct['status'], string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
};

function initialDraft(product: PanelProduct): ProductDraft {
  return {
    status: product.status,
    variants: Object.fromEntries(
      product.variants.map((variant) => [
        variant.id,
        {
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? '',
          quantity: String(variant.inventoryQuantity),
        },
      ]),
    ),
  };
}

function ProductRow({ product }: { product: PanelProduct }) {
  const [draft, setDraft] = useState(() => initialDraft(product));
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const statusChanged = draft.status !== product.status;
  const changedVariants = product.variants.map((variant) => {
    const value = draft.variants[variant.id];
    return {
      variant,
      value,
      pricingChanged:
        value.price !== variant.price || value.compareAtPrice !== (variant.compareAtPrice ?? ''),
      quantityChanged: value.quantity !== String(variant.inventoryQuantity),
    };
  });
  const dirty =
    statusChanged || changedVariants.some((entry) => entry.pricingChanged || entry.quantityChanged);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveProductAction({
        productId: product.id,
        status: draft.status,
        statusChanged,
        variants: changedVariants.map(({ variant, value, pricingChanged, quantityChanged }) => ({
          id: variant.id,
          inventoryItemId: variant.inventoryItemId,
          price: value.price,
          compareAtPrice: value.compareAtPrice,
          quantity: Number(value.quantity),
          pricingChanged,
          quantityChanged,
        })),
      });
      setFeedback(
        result.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: result.error ?? 'Failed.' },
      );
    });
  };

  // One tap when a piece sells in person: archive it and zero the stock.
  const markAsSold = () => {
    if (
      !window.confirm(`Mark "${product.title}" as sold? It will be archived and stock set to 0.`)
    ) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await saveProductAction({
        productId: product.id,
        status: 'ARCHIVED',
        statusChanged: product.status !== 'ARCHIVED',
        variants: product.variants.map((variant) => ({
          id: variant.id,
          inventoryItemId: variant.inventoryItemId,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? '',
          quantity: 0,
          pricingChanged: false,
          quantityChanged: variant.inventoryQuantity !== 0,
        })),
      });
      if (result.ok) {
        setDraft((current) => ({
          status: 'ARCHIVED',
          variants: Object.fromEntries(
            Object.entries(current.variants).map(([id, value]) => [
              id,
              { ...value, quantity: '0' },
            ]),
          ),
        }));
      }
      setFeedback(
        result.ok
          ? { ok: true, text: 'Marked as sold — archived with stock 0.' }
          : { ok: false, text: result.error ?? 'Failed.' },
      );
    });
  };

  const setVariant = (variantId: string, patch: Partial<VariantDraft>) =>
    setDraft((current) => ({
      ...current,
      variants: {
        ...current.variants,
        [variantId]: { ...current.variants[variantId], ...patch },
      },
    }));

  const numericId = product.id.split('/').pop();
  const single = product.variants.length === 1;
  const fieldClass =
    'w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white py-2 text-sm tabular-nums outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15';

  return (
    <div
      className={cn(
        'rounded-3xl border bg-white p-5 transition',
        dirty
          ? 'border-[rgb(var(--accent))]/40 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          : 'border-[rgb(var(--border))]',
      )}
    >
      {/* Identity + actions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-tight">{product.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase',
                draft.status === 'ACTIVE' &&
                  'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
                draft.status === 'DRAFT' && 'bg-amber-50 text-amber-700',
                draft.status === 'ARCHIVED' &&
                  'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  draft.status === 'ACTIVE' && 'bg-[rgb(var(--sage-ink))]',
                  draft.status === 'DRAFT' && 'bg-amber-500',
                  draft.status === 'ARCHIVED' && 'bg-[rgb(var(--muted))]',
                )}
              />
              {STATUS_LABEL[draft.status]}
            </span>
            {!single ? (
              <span className="text-xs text-[rgb(var(--muted))]">
                {product.variants.length} variants
              </span>
            ) : null}
            {single && product.variants[0].sku ? (
              <span className="text-xs text-[rgb(var(--muted))]">
                SKU {product.variants[0].sku}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/products/${numericId}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-xs font-semibold transition hover:border-[rgb(var(--fg))]"
          >
            <PencilLine aria-hidden="true" className="size-3.5" />
            Edit details
          </Link>
          <button
            type="button"
            onClick={markAsSold}
            disabled={pending}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-xs font-semibold text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] disabled:opacity-60"
          >
            <BadgeCheck aria-hidden="true" className="size-3.5" />
            Sold
          </button>
        </div>
      </div>

      {/* Inline pricing/stock editor */}
      <div className="mt-4 rounded-2xl bg-[rgb(var(--surface-muted))]/60 p-4">
        {single ? (
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
            {(() => {
              const variant = product.variants[0];
              const value = draft.variants[variant.id];
              return (
                <>
                  <label className="block text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                    Price
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[rgb(var(--muted))]">
                        $
                      </span>
                      <input
                        value={value.price}
                        onChange={(event) => setVariant(variant.id, { price: event.target.value })}
                        inputMode="decimal"
                        aria-label={`Price for ${product.title}`}
                        className={cn(fieldClass, 'pr-3 pl-7 font-semibold')}
                      />
                    </div>
                  </label>
                  <label className="block text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                    Compare-at
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[rgb(var(--muted))]">
                        $
                      </span>
                      <input
                        value={value.compareAtPrice}
                        onChange={(event) =>
                          setVariant(variant.id, {
                            compareAtPrice: event.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`Compare-at price for ${product.title}`}
                        className={cn(fieldClass, 'pr-3 pl-7')}
                      />
                    </div>
                  </label>
                  <label className="block text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                    Stock
                    <input
                      value={value.quantity}
                      onChange={(event) => setVariant(variant.id, { quantity: event.target.value })}
                      inputMode="numeric"
                      aria-label={`Stock for ${product.title}`}
                      className={cn(fieldClass, 'mt-1.5 px-3')}
                    />
                  </label>
                </>
              );
            })()}
            <label className="block text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as PanelProduct['status'],
                  }))
                }
                className={cn(fieldClass, 'mt-1.5 px-3 font-semibold')}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className={cn(
                'col-span-2 min-h-10 rounded-full px-6 text-xs font-bold transition sm:col-span-1',
                dirty
                  ? 'bg-[rgb(var(--fg))] text-white shadow-sm hover:bg-[rgb(var(--fg))]/90'
                  : 'cursor-default border border-[rgb(var(--border))] bg-white text-[rgb(var(--muted))]/60',
                pending && 'opacity-60',
              )}
            >
              {pending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-[rgb(var(--muted))] uppercase">
                Status
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as PanelProduct['status'],
                    }))
                  }
                  className="min-h-9 rounded-full border border-[rgb(var(--border-strong))] bg-white px-3 text-xs font-semibold tracking-normal normal-case"
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || pending}
                className={cn(
                  'min-h-9 rounded-full px-5 text-xs font-bold transition',
                  dirty
                    ? 'bg-[rgb(var(--fg))] text-white shadow-sm hover:bg-[rgb(var(--fg))]/90'
                    : 'cursor-default border border-[rgb(var(--border))] bg-white text-[rgb(var(--muted))]/60',
                  pending && 'opacity-60',
                )}
              >
                {pending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-[rgb(var(--muted))] uppercase">
                    <th className="py-2 pr-4 font-bold">Variant</th>
                    <th className="py-2 pr-4 font-bold">SKU</th>
                    <th className="py-2 pr-4 font-bold">Price (USD)</th>
                    <th className="py-2 pr-4 font-bold">Compare-at</th>
                    <th className="py-2 font-bold">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {product.variants.map((variant) => {
                    const value = draft.variants[variant.id];
                    return (
                      <tr key={variant.id}>
                        <td className="py-2.5 pr-4 font-medium">
                          {variant.title === 'Default Title' ? '—' : variant.title}
                        </td>
                        <td className="py-2.5 pr-4 text-[rgb(var(--muted))]">
                          {variant.sku || '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <input
                            value={value.price}
                            onChange={(event) =>
                              setVariant(variant.id, {
                                price: event.target.value,
                              })
                            }
                            inputMode="decimal"
                            aria-label={`Price for ${product.title} ${variant.title}`}
                            className={cn(fieldClass, 'w-24 px-2.5')}
                          />
                        </td>
                        <td className="py-2.5 pr-4">
                          <input
                            value={value.compareAtPrice}
                            onChange={(event) =>
                              setVariant(variant.id, {
                                compareAtPrice: event.target.value,
                              })
                            }
                            inputMode="decimal"
                            placeholder="—"
                            aria-label={`Compare-at price for ${product.title} ${variant.title}`}
                            className={cn(fieldClass, 'w-24 px-2.5')}
                          />
                        </td>
                        <td className="py-2.5">
                          <input
                            value={value.quantity}
                            onChange={(event) =>
                              setVariant(variant.id, {
                                quantity: event.target.value,
                              })
                            }
                            inputMode="numeric"
                            aria-label={`Stock for ${product.title} ${variant.title}`}
                            className={cn(fieldClass, 'w-20 px-2.5')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn(
            'mt-3 text-xs font-semibold',
            feedback.ok ? 'text-[rgb(var(--sage-ink))]' : 'text-[rgb(var(--accent))]',
          )}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}

export function ProductsManager({ products }: { products: PanelProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white px-6 py-16 text-center text-sm text-[rgb(var(--muted))]">
        No products found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductRow key={product.id} product={product} />
      ))}
    </div>
  );
}
