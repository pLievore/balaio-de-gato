import { AlertTriangle, Wallet } from 'lucide-react';

import type { EducationStage } from '../../../src/lib/program/material-escolar';
import { cn } from '../../../src/lib/cn';
import { formatBRL } from '../../../src/lib/money';

/**
 * Barra de crédito do Programa Material Escolar.
 *
 * Mostra quanto do crédito da etapa o carrinho já ocupa. Os valores são os
 * publicados pela SME por etapa — não são o saldo real do responsável, que só
 * o aplicativo Kit Escolar conhece. O texto abaixo diz isso sempre, porque
 * confundir os dois levaria alguém a montar um pedido que não pode pagar.
 */
export function BenefitMeter({
  stage,
  subtotalInCents,
  remainingInCents,
  overBudgetInCents,
  usedRatio,
  className,
  compact = false,
}: {
  stage: EducationStage;
  subtotalInCents: number;
  remainingInCents: number;
  overBudgetInCents: number;
  usedRatio: number;
  className?: string;
  compact?: boolean;
}) {
  const over = overBudgetInCents > 0;
  const percent = Math.round(usedRatio * 100);

  return (
    <section
      aria-label={`Crédito de ${stage.shortName}`}
      className={cn(
        'rounded-3xl border p-5 md:p-6',
        over
          ? 'border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent-soft))]'
          : 'border-[rgb(var(--sage))]/25 bg-[rgb(var(--sage-soft))]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-2xl',
              over ? 'bg-[rgb(var(--accent))] text-white' : 'bg-[rgb(var(--sage-ink))] text-white',
            )}
          >
            {over ? <AlertTriangle className="size-4.5" /> : <Wallet className="size-4.5" />}
          </span>
          <div>
            <p
              className={cn(
                'text-[11px] font-extrabold tracking-[0.14em] uppercase',
                over ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--sage-ink))]',
              )}
            >
              Crédito da etapa
            </p>
            <p className="text-sm font-extrabold">{stage.shortName}</p>
          </div>
        </div>

        <p className="tabular-nums-tight text-right">
          <span className="font-display block text-xl font-black">
            {formatBRL(stage.benefitAmountInCents)}
          </span>
          <span className="text-[11px] font-bold text-[rgb(var(--muted))]">crédito da etapa</span>
        </p>
      </div>

      <div className="mt-5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${formatBRL(subtotalInCents)} de ${formatBRL(stage.benefitAmountInCents)} usados`}
          className="h-2.5 w-full overflow-hidden rounded-full bg-white/70"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-expo)]',
              over ? 'bg-[rgb(var(--accent))]' : 'bg-[rgb(var(--sage-ink))]',
            )}
            style={{ width: `${Math.max(percent, subtotalInCents > 0 ? 3 : 0)}%` }}
          />
        </div>

        <div className="tabular-nums-tight mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-bold">
            {formatBRL(subtotalInCents)}{' '}
            <span className="font-semibold text-[rgb(var(--muted))]">no carrinho</span>
          </span>
          {over ? (
            <span className="font-extrabold text-[rgb(var(--accent))]">
              {formatBRL(overBudgetInCents)} acima do crédito
            </span>
          ) : (
            <span className="font-extrabold text-[rgb(var(--sage-ink))]">
              {formatBRL(remainingInCents)} disponíveis
            </span>
          )}
        </div>
      </div>

      {over ? (
        <p className="mt-4 text-xs leading-5 font-semibold">
          Você pode seguir assim: a loja confirma no atendimento como pagar a diferença. Ou remova
          itens até caber no crédito.
        </p>
      ) : null}

      {!compact ? (
        <p className="mt-4 border-t border-current/10 pt-3 text-[11px] leading-5 text-[rgb(var(--muted))]">
          Este é o valor publicado pela Prefeitura para a etapa. Consulte o saldo real do estudante
          no aplicativo Kit Escolar.
        </p>
      ) : null}
    </section>
  );
}
