'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, GraduationCap, ShoppingBasket, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { useCartStore } from '../../../src/lib/cart/store';
import { canSubmitOrder, type CartItemView } from '../../../src/lib/cart/summary';
import { describeIssue } from '../../../src/lib/cart/types';
import { cn } from '../../../src/lib/cn';
import { formatBRL } from '../../../src/lib/money';
import { EDUCATION_STAGES, getEducationStage } from '../../../src/lib/program/material-escolar';
import { ProductIllustration } from '../product-illustration';
import { buttonStyles } from '../ui/button';
import { limitFor } from './add-to-cart';
import { BenefitMeter } from './benefit-meter';
import { useCartSummary } from './cart-catalog';
import { QuantityStepper } from './quantity-stepper';

export function CartView() {
  const summary = useCartSummary();
  const stageSlug = useCartStore((state) => state.stage);
  const stage = stageSlug ? getEducationStage(stageSlug) : undefined;

  // Antes da hidratação o carrinho ainda não foi lido do navegador.
  if (summary === null) return <CartSkeleton />;
  if (summary.items.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div className="min-w-0">
        {summary.missingSlugs.length > 0 ? <MissingNotice slugs={summary.missingSlugs} /> : null}

        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {summary.items.map((item) => (
              <CartLineItem key={item.product.slug} item={item} />
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/products"
            className="text-sm font-extrabold text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
          >
            Continuar escolhendo materiais
          </Link>
          <ClearCartButton />
        </div>
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <StagePicker />

        {stage ? (
          <BenefitMeter
            stage={stage}
            subtotalInCents={summary.subtotalInCents}
            remainingInCents={summary.remainingInCents ?? 0}
            overBudgetInCents={summary.overBudgetInCents}
            usedRatio={summary.benefitUsedRatio}
            className="mt-4"
            compact
          />
        ) : null}

        <OrderSummary summary={summary} />
      </div>
    </div>
  );
}

// ─── Linha do carrinho ───────────────────────────────────────────────────────

function CartLineItem({ item }: { item: CartItemView }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const reduced = useReducedMotion();
  const { product } = item;
  const limit = limitFor(product);
  const hasIssues = item.issues.length > 0;

  return (
    <motion.li
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'overflow-hidden rounded-2xl border bg-white',
        hasIssues ? 'border-[rgb(var(--accent))]/35' : 'border-[rgb(var(--border))]',
      )}
    >
      <div className="flex gap-4 p-4">
        <Link
          href={`/products/${product.slug}`}
          className="size-20 shrink-0 overflow-hidden rounded-xl sm:size-24"
          aria-label={product.name}
        >
          <ProductIllustration
            illustration={product.illustration}
            seed={product.slug}
            showGrid={false}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.1em] text-[rgb(var(--muted))] uppercase">
                {product.brand}
              </p>
              <h3 className="mt-0.5 text-sm leading-snug font-extrabold">
                <Link href={`/products/${product.slug}`} className="hover:underline">
                  {product.name}
                </Link>
              </h3>
              <p className="tabular-nums-tight mt-1 text-xs font-bold text-[rgb(var(--muted))]">
                {formatBRL(product.priceInCents)} cada
              </p>
            </div>

            <p className="tabular-nums-tight shrink-0 text-right">
              <span className="block text-base font-black">{formatBRL(item.lineTotalInCents)}</span>
              {item.lineSavingsInCents > 0 ? (
                <span className="text-[11px] font-bold text-[rgb(var(--sage-ink))]">
                  −{formatBRL(item.lineSavingsInCents)}
                </span>
              ) : null}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={item.quantity}
              onChange={(next) => setQuantity(product.slug, next, Math.max(limit, next))}
              max={Math.max(limit, item.quantity)}
              size="sm"
              label={`Quantidade de ${product.name}`}
              disabled={limit === 0}
            />
            <button
              type="button"
              onClick={() => removeLine(product.slug)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--accent))]"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Remover
              <span className="sr-only">{product.name}</span>
            </button>
          </div>
        </div>
      </div>

      {hasIssues ? (
        <ul className="border-t border-[rgb(var(--accent))]/20 bg-[rgb(var(--accent-soft))] px-4 py-3">
          {item.issues.map((issue) => (
            <li
              key={issue.kind}
              className="flex items-start gap-2 text-xs leading-5 font-bold text-[rgb(var(--accent))]"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {describeIssue(issue)}
            </li>
          ))}
        </ul>
      ) : null}
    </motion.li>
  );
}

// ─── Resumo e ações ──────────────────────────────────────────────────────────

function OrderSummary({ summary }: { summary: ReturnType<typeof useCartSummary> }) {
  if (summary === null) return null;
  const ready = canSubmitOrder(summary);

  return (
    <section className="mt-4 rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
      <h2 className="text-sm font-extrabold">Resumo do pedido</h2>

      <dl className="tabular-nums-tight mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[rgb(var(--muted))]">
            {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'itens'}
          </dt>
          <dd className="font-bold">{formatBRL(summary.subtotalInCents)}</dd>
        </div>
        {summary.savingsInCents > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[rgb(var(--sage-ink))]">Você economiza</dt>
            <dd className="font-bold text-[rgb(var(--sage-ink))]">
              −{formatBRL(summary.savingsInCents)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-[rgb(var(--muted))]">Entrega</dt>
          <dd className="font-bold text-[rgb(var(--sage-ink))]">Grátis</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-[rgb(var(--border))] pt-3">
          <dt className="font-extrabold">Total</dt>
          <dd className="font-display text-xl font-black">{formatBRL(summary.subtotalInCents)}</dd>
        </div>
      </dl>

      {ready ? (
        <Link href="/checkout" className={buttonStyles({ size: 'lg', className: 'mt-6 w-full' })}>
          Revisar e enviar pedido
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <div className="mt-6">
          <span
            className={buttonStyles({
              size: 'lg',
              className: 'pointer-events-none w-full opacity-50',
            })}
          >
            Revisar e enviar pedido
          </span>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 font-bold text-[rgb(var(--accent))]">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Ajuste os itens marcados acima para seguir.
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-5 text-[rgb(var(--muted))]">
        O pagamento acontece depois: a loja confere o pedido e envia um link seguro. A senha e o
        código do cartão nunca são pedidos aqui.
      </p>
    </section>
  );
}

function StagePicker() {
  const stage = useCartStore((state) => state.stage);
  const setStage = useCartStore((state) => state.setStage);

  return (
    <section className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <GraduationCap aria-hidden="true" className="size-4 text-[rgb(var(--accent))]" />
        Ano ou etapa do estudante
      </h2>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
        Define o crédito do Kit Escolar e quais itens estão autorizados.
      </p>
      <label htmlFor="etapa-carrinho" className="sr-only">
        Ano ou etapa do estudante
      </label>
      <select
        id="etapa-carrinho"
        value={stage ?? ''}
        onChange={(event) => setStage(event.target.value || null)}
        className="mt-3 min-h-11 w-full cursor-pointer rounded-full border border-[rgb(var(--border-strong))] bg-white px-4 text-sm font-bold transition focus:border-[rgb(var(--accent))]"
      >
        <option value="">Selecione o ano ou a etapa…</option>
        {EDUCATION_STAGES.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.shortName} — {formatBRL(option.benefitAmountInCents)}
          </option>
        ))}
      </select>
    </section>
  );
}

function ClearCartButton() {
  const clear = useCartStore((state) => state.clear);
  return (
    <button
      type="button"
      onClick={() => clear()}
      className="text-xs font-bold text-[rgb(var(--muted))] underline decoration-current/25 underline-offset-4 transition hover:text-[rgb(var(--accent))]"
    >
      Esvaziar carrinho
    </button>
  );
}

// ─── Estados vazios ──────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="rounded-3xl border border-dashed border-[rgb(var(--border-strong))] bg-white px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]"
      >
        <ShoppingBasket className="size-8" />
      </span>
      <h2 className="font-display mt-6 text-2xl font-extrabold">Seu balaio ainda está vazio.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[rgb(var(--muted))]">
        Escolha o ano do estudante e monte a lista com os materiais autorizados no crédito do Kit
        Escolar.
      </p>
      <Link href="/products" className={buttonStyles({ size: 'lg', className: 'mt-8' })}>
        Ver os materiais
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

/**
 * Aviso dos itens que saíram do catálogo.
 *
 * O botão retira só os itens que sumiram. Antes ele chamava `clear()` e
 * apagava o carrinho inteiro: a pessoa perdia a lista escolar completa ao
 * tentar resolver um aviso sobre um único item.
 */
function MissingNotice({ slugs }: { slugs: string[] }) {
  const removeLine = useCartStore((state) => state.removeLine);
  const count = slugs.length;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--sun))]/40 bg-[rgb(var(--sun-soft))] p-4">
      <p className="text-xs leading-5 font-bold">
        {count === 1
          ? 'Um item do seu carrinho saiu do catálogo e foi retirado.'
          : `${count} itens do seu carrinho saíram do catálogo e foram retirados.`}
      </p>
      <button
        type="button"
        onClick={() => slugs.forEach((slug) => removeLine(slug))}
        className="inline-flex min-h-11 items-center text-xs font-extrabold underline underline-offset-4"
      >
        {count === 1 ? 'Retirar o item do carrinho' : 'Retirar os itens do carrinho'}
      </button>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer h-32 rounded-2xl border border-[rgb(var(--border))]"
          />
        ))}
      </div>
      <div className="skeleton-shimmer h-64 rounded-3xl border border-[rgb(var(--border))]" />
      <span className="sr-only">Carregando o carrinho…</span>
    </div>
  );
}
