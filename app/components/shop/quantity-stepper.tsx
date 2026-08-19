'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { cn } from '../../../src/lib/cn';

/**
 * Seletor de quantidade.
 *
 * O número é um `input` de verdade, não só um texto entre dois botões: quem
 * quer 10 unidades digita 10 em vez de tocar nove vezes no mais. Os botões
 * param no limite e ficam desabilitados lá, para que o toque sem efeito seja
 * visível antes de acontecer.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = 'Quantidade',
  size = 'md',
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const inputId = useId();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const buttonSize = size === 'sm' ? 'size-10' : 'size-11';
  const fieldWidth = size === 'sm' ? 'w-9' : 'w-11';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-[rgb(var(--border-strong))] bg-white',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
        className={cn(
          buttonSize,
          'flex items-center justify-center rounded-full text-[rgb(var(--fg))] transition',
          'hover:bg-[rgb(var(--surface-muted))] disabled:pointer-events-none disabled:opacity-35',
        )}
      >
        <Minus aria-hidden="true" className="size-4" strokeWidth={3} />
      </button>

      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          // Campo vazio no meio da digitação não deve virar NaN nem saltar
          // para o mínimo; só um número real move a quantidade.
          if (Number.isFinite(next) && event.target.value !== '') onChange(clamp(next));
        }}
        className={cn(
          fieldWidth,
          textSize,
          'tabular-nums-tight [appearance:textfield] border-0 bg-transparent text-center font-extrabold',
          'focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
        className={cn(
          buttonSize,
          'flex items-center justify-center rounded-full text-[rgb(var(--fg))] transition',
          'hover:bg-[rgb(var(--surface-muted))] disabled:pointer-events-none disabled:opacity-35',
        )}
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={3} />
      </button>
    </div>
  );
}
