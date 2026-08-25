import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import Link from 'next/link';

import { cn } from '../../../src/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'sage' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:-translate-y-px',
    variant === 'primary' &&
      'bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-strong))]',
    variant === 'secondary' &&
      'border border-[rgb(var(--border-strong))] bg-white text-[rgb(var(--fg))] hover:bg-neutral-50',
    variant === 'sage' && 'bg-[rgb(var(--sage-ink))] text-white hover:bg-[rgb(var(--sage-ink))]/90',
    variant === 'ghost' && 'text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-muted))]',
    size === 'sm' && 'min-h-9 px-4 py-2 text-xs',
    size === 'md' && 'min-h-11 px-5 py-2.5 text-sm',
    size === 'lg' && 'min-h-12 px-7 py-3 text-sm',
    size === 'icon' && 'size-11 p-0',
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ className, variant, size, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
});

export function ButtonLink({
  href,
  children,
  className,
  variant,
  size,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={buttonStyles({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
