import type { HTMLAttributes } from 'react';

import { cn } from '../../../src/lib/cn';

export function Section({
  className,
  spacing = 'md',
  ...props
}: HTMLAttributes<HTMLElement> & {
  spacing?: 'sm' | 'md' | 'lg';
}) {
  return (
    <section
      className={cn(
        spacing === 'sm' && 'py-10 md:py-12',
        spacing === 'md' && 'py-14 md:py-18',
        spacing === 'lg' && 'py-18 md:py-24',
        className,
      )}
      {...props}
    />
  );
}
