'use client';

import { CircleAlert, CircleCheck, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { saveProductAction, type ProductActionState } from './actions';
import { CATEGORIES } from '../../../src/lib/catalog/categories';
import { EDUCATION_STAGES } from '../../../src/lib/program/material-escolar';
import { slugify } from '../../../src/lib/panel/product-form';
import type { PanelProductDetail } from '../../../src/lib/panel/catalog';

const INICIAL: ProductActionState = { status: 'idle' };

/** Arquétipos de ilustração disponíveis enquanto não há foto do produto. */
const ILLUSTRATIONS = [
  'caderno',
  'bloco',
  'papel',
  'lapis',
  'caneta',
  'borracha',
  'apontador',
  'marcador',
  'lapis-cor',
  'giz-cera',
  'canetinha',
  'tinta',
  'pincel',
  'massinha',
  'tesoura',
  'cola',
  'regua',
  'compasso',
  'mochila',
  'estojo',
  'pasta',
  'agenda',
];

type Spec = { label: string; value: string };

export function ProductForm({ product }: { product?: PanelProductDetail }) {
  const [state, formAction, pending] = useActionState(saveProductAction, INICIAL);
  const router = useRouter();
  const editing = Boolean(product);
  const erroRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');

  /**
   * Os demais campos, controlados.
   *
   * O React 19 limpa os campos não controlados de um `<form action={…}>`
   * depois da ação. Como a validação é do servidor, uma recusa — SKU
   * duplicado, endereço já usado, preço mal formatado, sessão expirada —
   * apagava marca, SKU, descrição, categoria, preço, limite e as etapas
   * marcadas, deixando na tela "Confira os campos destacados abaixo"
   * apontando para campos recém-esvaziados. Em cadastro novo, o trabalho
   * inteiro.
   */
  const [campos, setCampos] = useState({
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    tagline: product?.tagline ?? '',
    description: product?.description ?? '',
    categorySlug: product?.categorySlug ?? '',
    status: product?.status ?? 'draft',
    illustrationKey: product?.illustrationKey ?? '',
    keywords: product?.keywords.join(', ') ?? '',
    price: product ? (product.priceInCents / 100).toFixed(2).replace('.', ',') : '',
    compareAtPrice: product?.compareAtPriceInCents
      ? (product.compareAtPriceInCents / 100).toFixed(2).replace('.', ',')
      : '',
    maxPerOrder: String(product?.maxPerOrder ?? 5),
  });
  const [etapas, setEtapas] = useState<string[]>(product?.stageSlugs ?? []);

  const mudar = (campo: keyof typeof campos, valor: string) =>
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  const [slugTocado, setSlugTocado] = useState(editing);
  const [specs, setSpecs] = useState<Spec[]>(
    product?.specifications.length ? product.specifications : [{ label: '', value: '' }],
  );

  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status === 'invalid' || state.status === 'error') erroRef.current?.focus();
    if (state.status === 'success' && !editing) {
      router.push(`/admin/products/${state.slug}`);
    }
  }, [state, editing, router]);

  return (
    <form action={formAction} className="space-y-6">
      {editing ? <input type="hidden" name="originalSlug" value={product!.slug} /> : null}
      <input type="hidden" name="specifications" value={JSON.stringify(specs)} />

      {state.status === 'invalid' || state.status === 'error' ? (
        <div
          ref={erroRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 outline-none"
        >
          <span className="flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.status === 'error' ? state.message : 'Confira os campos destacados abaixo.'}
          </span>
        </div>
      ) : null}

      {state.status === 'success' ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-[rgb(var(--sage))]/30 bg-[rgb(var(--sage-soft))] p-4 text-sm font-semibold text-[rgb(var(--sage-ink))]"
        >
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      ) : null}

      <Bloco titulo="Identificação">
        <Campo
          label="Nome do produto"
          erro={fieldErrors.name}
          obrigatorio
          className="sm:col-span-2"
        >
          <input
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTocado) setSlug(slugify(event.target.value));
            }}
            className={entrada(Boolean(fieldErrors.name))}
            placeholder="Caderno brochura 96 folhas"
          />
        </Campo>

        <Campo
          label="Endereço na loja"
          erro={fieldErrors.slug}
          obrigatorio
          dica="Aparece na URL. Gerado a partir do nome, mas você pode ajustar."
          className="sm:col-span-2"
        >
          <input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTocado(true);
              setSlug(event.target.value);
            }}
            className={`${entrada(Boolean(fieldErrors.slug))} font-mono`}
            placeholder="caderno-brochura-96-folhas"
          />
        </Campo>

        <Campo label="Marca" erro={fieldErrors.brand} obrigatorio>
          <input
            name="brand"
            value={campos.brand}
            onChange={(event) => mudar('brand', event.target.value)}
            className={entrada(Boolean(fieldErrors.brand))}
            placeholder="Tilibra"
          />
        </Campo>

        <Campo label="SKU" erro={fieldErrors.sku} obrigatorio>
          <input
            name="sku"
            value={campos.sku}
            onChange={(event) => mudar('sku', event.target.value)}
            className={`${entrada(Boolean(fieldErrors.sku))} font-mono uppercase`}
            placeholder="CAD-BRO-96"
          />
        </Campo>

        <Campo
          label="Linha de apoio"
          erro={fieldErrors.tagline}
          obrigatorio
          dica="Frase curta que aparece no card, abaixo do nome."
          className="sm:col-span-2"
        >
          <input
            name="tagline"
            value={campos.tagline}
            onChange={(event) => mudar('tagline', event.target.value)}
            className={entrada(Boolean(fieldErrors.tagline))}
            placeholder="Capa dura, costurado, pauta larga"
          />
        </Campo>

        <Campo
          label="Descrição"
          erro={fieldErrors.description}
          obrigatorio
          className="sm:col-span-2"
        >
          <textarea
            name="description"
            rows={5}
            value={campos.description}
            onChange={(event) => mudar('description', event.target.value)}
            className={`${entrada(Boolean(fieldErrors.description))} min-h-28 resize-y py-2.5`}
            placeholder="O que o material é e por que ele serve."
          />
        </Campo>
      </Bloco>

      <Bloco titulo="Classificação e vitrine">
        <Campo label="Categoria" erro={fieldErrors.categorySlug} obrigatorio>
          <select
            name="categorySlug"
            value={campos.categorySlug}
            onChange={(event) => mudar('categorySlug', event.target.value)}
            className={`${entrada(Boolean(fieldErrors.categorySlug))} cursor-pointer`}
          >
            <option value="">Selecione…</option>
            {CATEGORIES.map((categoria) => (
              <option key={categoria.slug} value={categoria.slug}>
                {categoria.name}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Situação" obrigatorio>
          <select
            name="status"
            value={campos.status}
            onChange={(event) => mudar('status', event.target.value)}
            className={`${entrada(false)} cursor-pointer`}
          >
            <option value="draft">Rascunho — não aparece na loja</option>
            <option value="active">Ativo — visível na loja</option>
            <option value="archived">Arquivado</option>
          </select>
        </Campo>

        <Campo
          label="Ilustração"
          dica="Usada enquanto o produto não tiver foto."
          className="sm:col-span-2"
        >
          <select
            name="illustrationKey"
            value={campos.illustrationKey}
            onChange={(event) => mudar('illustrationKey', event.target.value)}
            className={`${entrada(false)} cursor-pointer`}
          >
            <option value="">Sem ilustração</option>
            {ILLUSTRATIONS.map((chave) => (
              <option key={chave} value={chave}>
                {chave}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          label="Palavras-chave"
          dica="Separadas por vírgula. Ajudam quem busca por outro nome."
          className="sm:col-span-2"
        >
          <input
            name="keywords"
            value={campos.keywords}
            onChange={(event) => mudar('keywords', event.target.value)}
            className={entrada(false)}
            placeholder="brochurão, capa dura, pautado"
          />
        </Campo>
      </Bloco>

      <Bloco titulo="Preço e limite">
        <Campo label="Preço" erro={fieldErrors.price} obrigatorio>
          <input
            name="price"
            inputMode="decimal"
            value={campos.price}
            onChange={(event) => mudar('price', event.target.value)}
            className={entrada(Boolean(fieldErrors.price))}
            placeholder="14,90"
          />
        </Campo>

        <Campo
          label="Preço anterior"
          erro={fieldErrors.compareAtPrice}
          dica="Deixe vazio se não estiver em oferta."
        >
          <input
            name="compareAtPrice"
            inputMode="decimal"
            value={campos.compareAtPrice}
            onChange={(event) => mudar('compareAtPrice', event.target.value)}
            className={entrada(Boolean(fieldErrors.compareAtPrice))}
            placeholder="18,90"
          />
        </Campo>

        <Campo
          label="Limite por pedido"
          erro={fieldErrors.maxPerOrder}
          obrigatorio
          dica="Quantas unidades um mesmo pedido pode levar."
        >
          <input
            name="maxPerOrder"
            type="number"
            min={1}
            value={campos.maxPerOrder}
            onChange={(event) => mudar('maxPerOrder', event.target.value)}
            className={entrada(Boolean(fieldErrors.maxPerOrder))}
          />
        </Campo>
      </Bloco>

      <Bloco
        titulo="Etapas autorizadas"
        descricao="Sem etapa marcada o item não pode ser comprado com o crédito do Kit Escolar. É o campo que decide se o produto existe para o programa."
        colunas={1}
      >
        {fieldErrors.stageSlugs ? (
          <p className="text-xs font-bold text-red-700">{fieldErrors.stageSlugs}</p>
        ) : null}
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {EDUCATION_STAGES.map((etapa) => (
            <label
              key={etapa.slug}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 transition hover:bg-[rgb(var(--surface-muted))]"
            >
              <input
                type="checkbox"
                name="stageSlugs"
                value={etapa.slug}
                checked={etapas.includes(etapa.slug)}
                onChange={(event) =>
                  setEtapas((atual) =>
                    event.target.checked
                      ? [...atual, etapa.slug]
                      : atual.filter((entrada) => entrada !== etapa.slug),
                  )
                }
                className="size-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="min-w-0 flex-1 text-sm font-semibold">{etapa.shortName}</span>
            </label>
          ))}
        </div>
      </Bloco>

      <Bloco
        titulo="Especificações"
        descricao="Aparecem em tabela na ficha do produto. Linhas incompletas são descartadas."
        colunas={1}
      >
        <ul className="space-y-2">
          {specs.map((spec, index) => (
            <li key={index} className="flex gap-2">
              <input
                aria-label={`Rótulo da especificação ${index + 1}`}
                value={spec.label}
                onChange={(event) => {
                  const proximo = [...specs];
                  proximo[index] = { ...proximo[index]!, label: event.target.value };
                  setSpecs(proximo);
                }}
                className={`${entrada(false)} sm:max-w-56`}
                placeholder="Folhas"
              />
              <input
                aria-label={`Valor da especificação ${index + 1}`}
                value={spec.value}
                onChange={(event) => {
                  const proximo = [...specs];
                  proximo[index] = { ...proximo[index]!, value: event.target.value };
                  setSpecs(proximo);
                }}
                className={entrada(false)}
                placeholder="96 folhas pautadas"
              />
              <button
                type="button"
                onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                aria-label={`Remover especificação ${index + 1}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[rgb(var(--muted))] transition hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSpecs([...specs, { label: '', value: '' }])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-xs font-bold transition hover:border-[rgb(var(--fg))]"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Adicionar linha
        </button>
      </Bloco>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-6 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {editing ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
        <p className="text-xs text-[rgb(var(--muted))]">
          {editing
            ? 'O estoque é ajustado em um bloco separado, porque cada mudança vira um movimento registrado.'
            : 'O produto nasce com estoque zero. Você lança a entrada depois de salvar.'}
        </p>
      </div>
    </form>
  );
}

// ─── Peças da tela ───────────────────────────────────────────────────────────

function entrada(invalido: boolean): string {
  return [
    'min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-semibold transition',
    'placeholder:font-medium placeholder:text-[rgb(var(--muted))]',
    invalido
      ? 'border-red-400 focus:border-red-500'
      : 'border-[rgb(var(--border-strong))] focus:border-[rgb(var(--accent))]',
  ].join(' ');
}

function Bloco({
  titulo,
  descricao,
  colunas = 2,
  children,
}: {
  titulo: string;
  descricao?: string;
  colunas?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
      <legend className="px-2 text-sm font-extrabold">{titulo}</legend>
      {descricao ? <p className="text-xs leading-5 text-[rgb(var(--muted))]">{descricao}</p> : null}
      <div className={`mt-5 grid gap-4 ${colunas === 2 ? 'sm:grid-cols-2' : ''}`}>{children}</div>
    </fieldset>
  );
}

function Campo({
  label,
  erro,
  dica,
  obrigatorio,
  className,
  children,
}: {
  label: string;
  erro?: string;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-xs font-extrabold">
        {label}
        {obrigatorio ? (
          <span aria-hidden="true" className="ml-0.5 text-[rgb(var(--accent))]">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-bold text-[rgb(var(--muted))]">(opcional)</span>
        )}
      </span>
      {dica ? (
        <span className="mt-1 block text-[11px] leading-4 text-[rgb(var(--muted))]">{dica}</span>
      ) : null}
      <span className="mt-1.5 block">{children}</span>
      {erro ? (
        <span className="mt-1.5 block text-[11px] font-bold text-red-700">{erro}</span>
      ) : null}
    </label>
  );
}
