'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../../src/lib/cn';

/**
 * Campo de formulário.
 *
 * A mensagem de erro fica ligada ao campo por `aria-describedby` e o campo
 * ganha `aria-invalid` — assim o leitor de tela anuncia o problema junto do
 * rótulo, em vez de deixar um texto vermelho solto que só quem enxerga
 * encontra.
 */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    required: true | undefined;
    'aria-required': true | undefined;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-extrabold">
        {label}
        {required ? (
          <span className="ml-0.5 text-[rgb(var(--accent))]" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-bold text-[rgb(var(--muted))]">(opcional)</span>
        )}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-[11px] leading-4 text-[rgb(var(--muted))]">
          {hint}
        </p>
      ) : null}

      <div className="mt-1.5">
        {children({
          id,
          required: required ? true : undefined,
          'aria-required': required ? true : undefined,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy || undefined,
        })}
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 text-[11px] leading-4 font-bold text-[rgb(var(--danger))]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function inputStyles({ invalid }: { invalid?: boolean } = {}) {
  return cn(
    'min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-semibold',
    'transition placeholder:font-medium placeholder:text-[rgb(var(--muted))]',
    '',
    invalid
      ? 'border-[rgb(var(--danger))] focus:border-[rgb(var(--danger))]'
      : 'border-[rgb(var(--border-strong))] focus:border-[rgb(var(--accent))]',
  );
}

export function TextInput({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={cn(inputStyles({ invalid }), className)} />;
}
