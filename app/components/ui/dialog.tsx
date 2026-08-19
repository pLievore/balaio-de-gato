'use client';

import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '../../../src/lib/cn';
import { Button } from './button';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
  placement?: 'center' | 'right';
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  triggerRef,
  placement = 'center',
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef?.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [onClose, open, triggerRef]);

  return typeof document === 'undefined'
    ? null
    : createPortal(
        <AnimatePresence>
          {open ? (
            <div className="fixed inset-0 z-[70]">
              <motion.button
                type="button"
                aria-label="Fechar janela"
                className="absolute inset-0 size-full bg-black/35 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                onClick={onClose}
              />
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 flex',
                  placement === 'center' && 'items-center justify-center p-5',
                  placement === 'right' && 'justify-end',
                )}
              >
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dialog-title"
                  aria-describedby={description ? 'dialog-description' : undefined}
                  className={cn(
                    'pointer-events-auto flex max-h-dvh w-full flex-col bg-[rgb(var(--bg))] shadow-2xl',
                    placement === 'center' &&
                      'max-w-lg rounded-3xl border border-[rgb(var(--border))]',
                    placement === 'right' && 'h-dvh max-w-sm',
                    className,
                  )}
                  initial={
                    reducedMotion
                      ? { opacity: 1 }
                      : placement === 'right'
                        ? { x: '100%' }
                        : { opacity: 0, y: 16, scale: 0.98 }
                  }
                  animate={placement === 'right' ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : placement === 'right'
                        ? { x: '100%' }
                        : { opacity: 0, y: 12, scale: 0.98 }
                  }
                  transition={{ duration: reducedMotion ? 0 : 0.25 }}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-4">
                    <div>
                      <h2 id="dialog-title" className="text-base font-semibold">
                        {title}
                      </h2>
                      {description ? (
                        <p
                          id="dialog-description"
                          className="mt-1 text-xs text-[rgb(var(--muted))]"
                        >
                          {description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      ref={closeRef}
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      aria-label="Fechar"
                      className="-mt-2 -mr-2"
                    >
                      <span aria-hidden="true" className="text-xl leading-none">
                        ×
                      </span>
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                </motion.div>
              </div>
            </div>
          ) : null}
        </AnimatePresence>,
        document.body,
      );
}

export function Drawer(props: Omit<DialogProps, 'placement'>) {
  return <Dialog {...props} placement="right" />;
}

export function Modal(props: Omit<DialogProps, 'placement'>) {
  return <Dialog {...props} placement="center" />;
}
