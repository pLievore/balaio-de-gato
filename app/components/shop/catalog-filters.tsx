'use client';

/**
 * Filtros do catálogo.
 *
 * Todo controle escreve na URL e deixa o servidor recalcular o resultado — não
 * há cópia do estado aqui. Isso custa uma navegação por clique, mas dá de
 * graça: link compartilhável, botão voltar funcionando e nenhuma chance de a
 * grade discordar dos filtros marcados.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { CategoryFacet } from '../../../src/lib/catalog/repository';
import { CATEGORIES } from '../../../src/lib/catalog/categories';
import type { CategorySlug } from '../../../src/lib/catalog/product';
import {
  buildCatalogHref,
  countActiveFilters,
  isQueryActive,
  SORT_OPTIONS,
  type CatalogQuery,
  type ProductSort,
} from '../../../src/lib/catalog/query';
import { EDUCATION_STAGES } from '../../../src/lib/program/material-escolar';
import { cn } from '../../../src/lib/cn';
import { formatBRL } from '../../../src/lib/money';
import { Button, buttonStyles } from '../ui/button';

type FiltersProps = {
  query: CatalogQuery;
  facets: CategoryFacet[];
  priceRange: { minInCents: number; maxInCents: number };
  total: number;
};

function useApplyQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = (next: CatalogQuery) => {
    startTransition(() => {
      // `scroll: false` mantém o olho onde está: marcar uma categoria não deve
      // jogar a página de volta ao topo e fazer perder a posição na lista.
      router.push(buildCatalogHref(next, pathname), { scroll: false });
    });
  };

  return { apply, pending };
}

// ─── Busca ───────────────────────────────────────────────────────────────────

export function CatalogSearch({ query }: { query: CatalogQuery }) {
  const { apply } = useApplyQuery();
  const [value, setValue] = useState(query.search);
  const [lastApplied, setLastApplied] = useState(query.search);
  const inputId = useId();

  // Quando a busca muda por fora — voltar no histórico, limpar filtros, clicar
  // num atalho — o campo acompanha. O ajuste acontece durante a renderização,
  // e não num efeito: assim a tela nunca chega a pintar o texto antigo.
  if (query.search !== lastApplied) {
    setLastApplied(query.search);
    setValue(query.search);
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        apply({ ...query, search: value.trim() });
      }}
      className="relative"
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar materiais
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[rgb(var(--muted))]"
      />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar materiais…"
        className={cn(
          'min-h-12 w-full rounded-full border border-[rgb(var(--border))] bg-white pr-24 pl-11',
          'text-sm font-semibold placeholder:font-medium placeholder:text-[rgb(var(--muted))]',
          'transition focus:border-[rgb(var(--accent))]/50 focus:outline-none',
        )}
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue('');
              apply({ ...query, search: '' });
            }}
            aria-label="Limpar busca"
            className="rounded-full p-2 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <Button type="submit" size="md" className="px-4">
          Buscar
        </Button>
      </div>
    </form>
  );
}

// ─── Ordenação ───────────────────────────────────────────────────────────────

export function SortSelect({ query }: { query: CatalogQuery }) {
  const { apply } = useApplyQuery();
  const selectId = useId();

  return (
    <div className="flex w-full min-w-0 items-center gap-2 min-[360px]:w-auto">
      <label htmlFor={selectId} className="shrink-0 text-xs font-bold text-[rgb(var(--muted))]">
        Ordenar
      </label>
      <select
        id={selectId}
        value={query.sort}
        onChange={(event) => apply({ ...query, sort: event.target.value as ProductSort })}
        className={cn(
          'min-h-11 min-w-0 flex-1 rounded-full border border-[rgb(var(--border))] bg-white px-4 pr-8 text-sm font-bold min-[360px]:flex-none',
          'cursor-pointer transition focus:border-[rgb(var(--accent))]/50 focus:outline-none',
        )}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Painel de filtros ───────────────────────────────────────────────────────

function FilterPanel({ query, facets, priceRange }: Omit<FiltersProps, 'total'>) {
  const { apply } = useApplyQuery();
  const facetBySlug = new Map(facets.map((facet) => [facet.slug, facet.count]));

  const toggleCategory = (slug: CategorySlug) => {
    const next = query.categories.includes(slug)
      ? query.categories.filter((entry) => entry !== slug)
      : [...query.categories, slug];
    apply({ ...query, categories: next });
  };

  // Degraus de preço redondos dentro da faixa real do catálogo. Um controle
  // deslizante seria mais bonito e muito pior de acertar no toque.
  const priceSteps = [1000, 2000, 3500, 5000, 10000].filter(
    (step) => step > priceRange.minInCents && step < priceRange.maxInCents,
  );

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-xs font-extrabold tracking-[0.14em] uppercase">Categoria</legend>
        <div className="mt-4 space-y-1">
          {CATEGORIES.map((category) => {
            const count = facetBySlug.get(category.slug) ?? 0;
            const checked = query.categories.includes(category.slug);
            const empty = count === 0 && !checked;

            return (
              <label
                key={category.slug}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition',
                  'hover:bg-[rgb(var(--surface-muted))]',
                  empty && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={empty}
                  onChange={() => toggleCategory(category.slug)}
                  className="size-4 shrink-0 accent-[rgb(var(--accent))]"
                />
                <span className="min-w-0 flex-1 text-sm font-bold">{category.shortName}</span>
                <span className="tabular-nums-tight shrink-0 text-xs font-bold text-[rgb(var(--muted))]">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-extrabold tracking-[0.14em] uppercase">Preço até</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {priceSteps.map((step) => {
            const active = query.maxPriceInCents === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => apply({ ...query, maxPriceInCents: active ? null : step })}
                aria-pressed={active}
                className={cn(
                  'tabular-nums-tight min-h-11 rounded-full border px-3.5 text-xs font-bold transition',
                  active
                    ? 'border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-white'
                    : 'border-[rgb(var(--border))] bg-white hover:border-[rgb(var(--border-strong))]',
                )}
              >
                {formatBRL(step)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-extrabold tracking-[0.14em] uppercase">
          Disponibilidade
        </legend>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[rgb(var(--surface-muted))]">
          <input
            type="checkbox"
            checked={query.inStockOnly}
            onChange={() => apply({ ...query, inStockOnly: !query.inStockOnly })}
            className="size-4 shrink-0 accent-[rgb(var(--accent))]"
          />
          <span className="text-sm font-bold">Somente itens em estoque</span>
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-extrabold tracking-[0.14em] uppercase">Ano ou etapa</legend>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
          Mostra apenas o que está autorizado para a etapa e revela o crédito disponível.
        </p>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => apply({ ...query, stage: null })}
            aria-pressed={query.stage === null}
            className={cn(
              'min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition',
              query.stage === null
                ? 'bg-[rgb(var(--fg))] text-white'
                : 'hover:bg-[rgb(var(--surface-muted))]',
            )}
          >
            Todas as etapas
          </button>
          {EDUCATION_STAGES.map((stage) => {
            const active = query.stage === stage.slug;
            return (
              <button
                key={stage.slug}
                type="button"
                onClick={() => apply({ ...query, stage: active ? null : stage.slug })}
                aria-pressed={active}
                className={cn(
                  'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  active
                    ? 'bg-[rgb(var(--fg))] text-white'
                    : 'hover:bg-[rgb(var(--surface-muted))]',
                )}
              >
                <span className="min-w-0 flex-1 text-sm font-bold">{stage.shortName}</span>
                <span
                  className={cn(
                    'tabular-nums-tight shrink-0 text-xs font-bold',
                    active ? 'text-[rgb(var(--sun))]' : 'text-[rgb(var(--muted))]',
                  )}
                >
                  {formatBRL(stage.benefitAmountInCents)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

// ─── Rail fixo no desktop ────────────────────────────────────────────────────

export function CatalogFilterRail(props: Omit<FiltersProps, 'total'>) {
  return (
    <aside
      aria-label="Filtros do catálogo"
      className="sticky top-28 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2 lg:block"
    >
      <div className="flex items-center justify-between gap-3 pb-5">
        <h2 className="text-sm font-extrabold">Filtrar</h2>
        {isQueryActive(props.query) ? (
          <Link
            href="/products"
            className="text-xs font-extrabold text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
          >
            Limpar tudo
          </Link>
        ) : null}
      </div>
      <FilterPanel {...props} />
    </aside>
  );
}

// ─── Gaveta no mobile ────────────────────────────────────────────────────────

export function CatalogFilterDrawer({ query, facets, priceRange, total }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeCount = countActiveFilters(query);

  // Trava o fundo enquanto a gaveta está aberta, senão o toque rola a página
  // atrás em vez da lista de filtros.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
    else triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles({
          variant: 'secondary',
          size: 'md',
          className: 'w-full min-[360px]:w-auto lg:hidden',
        })}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtrar
        {activeCount > 0 ? (
          <span className="tabular-nums-tight flex size-5 items-center justify-center rounded-full bg-[rgb(var(--accent))] text-[11px] font-black text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-[rgb(var(--fg))]/45 backdrop-blur-sm"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filtros do catálogo"
              tabIndex={-1}
              initial={{ y: reduced ? 0 : '100%' }}
              animate={{ y: 0 }}
              exit={{ y: reduced ? 0 : '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-[rgb(var(--bg))] shadow-2xl outline-none"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-5 py-4">
                <h2 className="font-display text-lg font-extrabold">Filtrar</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar filtros"
                  className="-m-2 rounded-full p-2 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
                <FilterPanel query={query} facets={facets} priceRange={priceRange} />
              </div>

              <div className="flex items-center gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4">
                {isQueryActive(query) ? (
                  <Link
                    href="/products"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({ variant: 'secondary', size: 'md' })}
                  >
                    Limpar
                  </Link>
                ) : null}
                <Button size="md" className="flex-1" onClick={() => setOpen(false)}>
                  Ver {total} {total === 1 ? 'material' : 'materiais'}
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ─── Resumo dos filtros ligados ──────────────────────────────────────────────

export function ActiveFilterChips({ query }: { query: CatalogQuery }) {
  const { apply } = useApplyQuery();
  if (!isQueryActive(query)) return null;

  const chips: { key: string; label: string; next: CatalogQuery }[] = [];

  if (query.search) {
    chips.push({
      key: 'busca',
      label: `“${query.search}”`,
      next: { ...query, search: '' },
    });
  }

  for (const slug of query.categories) {
    const category = CATEGORIES.find((entry) => entry.slug === slug);
    if (!category) continue;
    chips.push({
      key: `cat-${slug}`,
      label: category.shortName,
      next: { ...query, categories: query.categories.filter((entry) => entry !== slug) },
    });
  }

  if (query.stage) {
    const stage = EDUCATION_STAGES.find((entry) => entry.slug === query.stage);
    chips.push({
      key: 'etapa',
      label: stage?.shortName ?? 'Etapa',
      next: { ...query, stage: null },
    });
  }

  if (query.maxPriceInCents !== null) {
    chips.push({
      key: 'preco',
      label: `Até ${formatBRL(query.maxPriceInCents)}`,
      next: { ...query, maxPriceInCents: null },
    });
  }

  if (query.inStockOnly) {
    chips.push({
      key: 'estoque',
      label: 'Em estoque',
      next: { ...query, inStockOnly: false },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => apply(chip.next)}
          className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] bg-white pr-2 pl-3.5 text-xs font-bold transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))]"
        >
          {chip.label}
          <X aria-hidden="true" className="size-3.5 opacity-60 group-hover:opacity-100" />
          <span className="sr-only">— remover filtro</span>
        </button>
      ))}
      <Link
        href="/products"
        className="ml-1 text-xs font-extrabold text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
      >
        Limpar tudo
      </Link>
    </div>
  );
}
