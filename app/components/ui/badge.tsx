import type { HTMLAttributes } from 'react';

import { cn } from '../../../src/lib/cn';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'sage' | 'accent' | 'success';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
        tone === 'neutral' && 'border-[rgb(var(--border))] bg-white text-[rgb(var(--fg))]',
        tone === 'sage' &&
          'border-[rgb(var(--sage))]/35 bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
        tone === 'accent' &&
          'border-[rgb(var(--accent))]/35 bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        className,
      )}
      {...props}
    />
  );
}
