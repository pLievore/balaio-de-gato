'use client';

import { CircleAlert, CircleCheck, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useActionState } from 'react';

import {
  adjustStockAction,
  removeProductImageAction,
  uploadProductImageAction,
  type MediaActionState,
  type StockActionState,
} from '../actions';
import { ProductIllustration } from '../../../components/product-illustration';
import type { IllustrationKey } from '../../../../src/lib/catalog/product';
import type { PanelProductDetail } from '../../../../src/lib/panel/catalog';

const ESTOQUE_INICIAL: StockActionState = { status: 'idle' };
const MIDIA_INICIAL: MediaActionState = { status: 'idle' };

/**
 * Estoque fica fora do formulário do produto de propósito.
 *
 * Salvar dados cadastrais é uma coisa; mexer no saldo físico é outra, vira
 * movimento auditado e exige justificativa. Juntar os dois num único "salvar"
 * faria alguém alterar estoque sem perceber.
 */
export function StockPanel({ product }: { product: PanelProductDetail }) {
  const [state, formAction, pending] = useActionState(adjustStockAction, ESTOQUE_INICIAL);
  const disponivel = product.onHand - product.reserved;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <Numero rotulo="Em estoque" valor={product.onHand} />
        <Numero rotulo="Reservado" valor={product.reserved} tom="muted" />
        <Numero
          rotulo="Disponível"
          valor={disponivel}
          tom={disponivel <= 0 ? 'alerta' : disponivel <= 5 ? 'atencao' : 'ok'}
        />
      </dl>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slug" value={product.slug} />
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="block text-xs font-extrabold">Novo total</span>
            <input
              name="onHand"
              type="number"
              min={0}
              defaultValue={product.onHand}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white px-3.5 text-sm font-semibold tabular-nums focus:border-[rgb(var(--accent))]"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-extrabold">Motivo</span>
            <input
              name="reason"
              required
              placeholder="Recebimento da nota 1234, contagem de inventário…"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white px-3.5 text-sm font-semibold focus:border-[rgb(var(--accent))]"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-5 text-sm font-bold transition hover:border-[rgb(var(--fg))] disabled:opacity-50"
        >
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Ajustar estoque
        </button>

        <Aviso state={state} />

        <p className="text-[11px] leading-4 text-[rgb(var(--muted))]">
          O que está reservado pertence a pedidos abertos e não pode ser retirado: o novo total
          nunca fica abaixo de {product.reserved}.
        </p>
      </form>
    </div>
  );
}

export function MediaPanel({ product }: { product: PanelProductDetail }) {
  const [upload, uploadAction, uploading] = useActionState(uploadProductImageAction, MIDIA_INICIAL);
  const [remocao, removeAction, removendo] = useActionState(
    removeProductImageAction,
    MIDIA_INICIAL,
  );

  return (
    <div className="space-y-5">
      {product.media.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl bg-[rgb(var(--surface-muted))] p-4">
          <span className="size-20 shrink-0 overflow-hidden rounded-xl">
            <ProductIllustration
              illustration={(product.illustrationKey ?? 'caderno') as IllustrationKey}
              seed={product.slug}
            />
          </span>
          <p className="text-xs leading-5 text-[rgb(var(--muted))]">
            Sem foto ainda. A loja mostra esta ilustração no lugar. Assim que a primeira foto
            entrar, ela passa a ser a imagem principal.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {product.media.map((imagem, index) => (
            <li
              key={imagem.id}
              className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))]"
            >
              <span className="relative block aspect-square bg-[rgb(var(--surface-muted))]">
                <Image
                  src={imagem.objectKey}
                  alt={imagem.altText ?? ''}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </span>
              {index === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-[rgb(var(--fg))] px-2 py-0.5 text-[10px] font-black text-white">
                  principal
                </span>
              ) : null}
              <form action={removeAction}>
                <input type="hidden" name="mediaId" value={imagem.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <button
                  type="submit"
                  aria-label="Remover imagem"
                  disabled={removendo}
                  className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Aviso state={remocao} />

      <form action={uploadAction} className="space-y-3 border-t border-[rgb(var(--border))] pt-5">
        <input type="hidden" name="slug" value={product.slug} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-extrabold">Imagem</span>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
              className="mt-1.5 block w-full text-xs file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-full file:border file:border-[rgb(var(--border-strong))] file:bg-white file:px-4 file:text-xs file:font-bold"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-extrabold">
              Texto alternativo
              <span className="ml-1.5 font-bold text-[rgb(var(--muted))]">(opcional)</span>
            </span>
            <input
              name="altText"
              placeholder="Descreva a foto para quem não a enxerga"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white px-3.5 text-sm font-semibold focus:border-[rgb(var(--accent))]"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] bg-white px-5 text-sm font-bold transition hover:border-[rgb(var(--fg))] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-4" />
          )}
          Enviar imagem
        </button>

        <Aviso state={upload} />

        <p className="text-[11px] leading-4 text-[rgb(var(--muted))]">
          JPEG, PNG, WebP ou AVIF, até 5 MB. A primeira imagem da lista é a que abre a ficha do
          produto.
        </p>
      </form>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  tom = 'ok',
}: {
  rotulo: string;
  valor: number;
  tom?: 'ok' | 'muted' | 'atencao' | 'alerta';
}) {
  const cor = {
    ok: '',
    muted: 'text-[rgb(var(--muted))]',
    atencao: 'text-amber-700',
    alerta: 'text-red-700',
  }[tom];

  return (
    <div className="rounded-2xl bg-[rgb(var(--surface-muted))] px-3 py-3">
      <dt className="text-[10px] font-extrabold tracking-[0.1em] text-[rgb(var(--muted))] uppercase">
        {rotulo}
      </dt>
      <dd className={`mt-1 text-xl font-black tabular-nums ${cor}`}>{valor}</dd>
    </div>
  );
}

function Aviso({ state }: { state: StockActionState | MediaActionState }) {
  if (state.status === 'idle') return null;
  const sucesso = state.status === 'success';
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-2xl p-3 text-xs leading-5 font-semibold ${
        sucesso
          ? 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]'
          : 'bg-red-50 text-red-800'
      }`}
    >
      {sucesso ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      {state.message}
    </p>
  );
}
