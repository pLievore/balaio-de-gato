'use client';

/**
 * Avisos curtos de ação — "item adicionado", "quantidade no limite".
 *
 * Ficam numa região `polite`: o leitor de tela anuncia quando terminar o que
 * está dizendo, sem interromper a navegação. O aviso some sozinho, mas nunca é
 * o único lugar onde a informação aparece — o número do carrinho no cabeçalho
 * também muda, para quem não chegou a ver a mensagem.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { create } from 'zustand';

type ToastTone = 'success' | 'warning';

type Toast = {
  id: number;
  message: string;
  detail?: string;
  tone: ToastTone;
};

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
};

let nextId = 0;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    nextId += 1;
    const id = nextId;
    // No máximo três de cada vez: uma pilha maior cobre a página e deixa de
    // ser um aviso para virar um obstáculo.
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-3) }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  return useToastStore((state) => state.push);
}

const AUTO_DISMISS_MS = 4500;

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const reduced = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} reduced={reduced} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  reduced,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
  reduced: boolean | null;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const success = toast.tone === 'success';
  const Icon = success ? Check : TriangleAlert;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[0_18px_45px_rgba(24,50,77,0.16)]"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
          success
            ? 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]'
            : 'bg-[rgb(var(--sun-soft))] text-[rgb(var(--fg))]'
        }`}
      >
        <Icon className="size-4" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{toast.message}</p>
        {toast.detail ? (
          <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--muted))]">{toast.detail}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar aviso"
        className="-m-1 shrink-0 rounded-full p-1 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </motion.div>
  );
}
