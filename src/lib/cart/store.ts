'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AddToCartResult, CartLine } from './types';

type CartState = {
  lines: CartLine[];
  /** Etapa de ensino escolhida pelo responsável; define o crédito e o filtro. */
  stage: string | null;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;

  /**
   * `limit` é o menor entre estoque e teto por pedido, resolvido por quem
   * chama a partir do produto atual do servidor. O store não conhece produto:
   * ele só garante que a quantidade guardada nunca ultrapasse o permitido.
   */
  addLine: (slug: string, quantity: number, limit: number) => AddToCartResult;
  setQuantity: (slug: string, quantity: number, limit: number) => void;
  removeLine: (slug: string) => void;
  setStage: (stage: string | null) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      stage: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),

      addLine: (slug, quantity, limit) => {
        if (quantity < 1) return { ok: false, reason: 'Escolha ao menos uma unidade.' };
        if (limit < 1) return { ok: false, reason: 'Este item está sem estoque.' };

        const { lines } = get();
        const existing = lines.find((line) => line.slug === slug);
        const wanted = (existing?.quantity ?? 0) + quantity;
        const next = Math.min(wanted, limit);

        if (existing && next === existing.quantity) {
          return {
            ok: false,
            reason: `Você já tem o máximo permitido deste item no carrinho (${limit}).`,
          };
        }

        set({
          lines: existing
            ? lines.map((line) => (line.slug === slug ? { ...line, quantity: next } : line))
            : [...lines, { slug, quantity: next }],
        });

        return { ok: true, quantity: next };
      },

      setQuantity: (slug, quantity, limit) => {
        if (quantity < 1) {
          get().removeLine(slug);
          return;
        }
        const next = Math.min(quantity, limit);
        set({
          lines: get().lines.map((line) =>
            line.slug === slug ? { ...line, quantity: next } : line,
          ),
        });
      },

      removeLine: (slug) => {
        set({ lines: get().lines.filter((line) => line.slug !== slug) });
      },

      setStage: (stage) => set({ stage }),

      clear: () => set({ lines: [] }),
    }),
    {
      // O nome traz a versão: mudar o formato do carrinho invalida o antigo em
      // vez de tentar migrar um estado que o visitante nem lembra que existe.
      name: 'balaio-carrinho-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, stage: state.stage }),
      onRehydrateStorage: () => (state) => {
        // Publish the hydrated flag through Zustand so React subscribers are
        // notified. Mutating the snapshot directly leaves the UI in skeletons.
        state?.setHydrated(true);
      },
    },
  ),
);

export const selectItemCount = (state: CartState): number =>
  state.lines.reduce((count, line) => count + line.quantity, 0);

/**
 * Contagem só depois da hidratação. Antes disso devolve `null`, e o cabeçalho
 * esconde o selo — renderizar zero no servidor e outro número no cliente causa
 * um salto visível a cada carregamento.
 */
export function useHydratedItemCount(): number | null {
  const hydrated = useCartStore((state) => state.hydrated);
  const count = useCartStore(selectItemCount);
  return hydrated ? count : null;
}
