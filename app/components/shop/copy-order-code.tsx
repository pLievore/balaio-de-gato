'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Código do pedido com botão de copiar.
 *
 * O código também fica selecionável como texto: se a área de transferência não
 * estiver disponível — contexto sem HTTPS, permissão negada — ainda dá para
 * marcar e copiar à mão, e o botão avisa em vez de falhar em silêncio.
 */
export function CopyOrderCode({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copiado' | 'falhou'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const announce = (next: 'copiado' | 'falhou') => {
    setState(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2500);
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--sage-ink))]/30 bg-white px-5 py-3">
        <code className="font-display text-2xl font-black tracking-[0.08em] select-all md:text-3xl">
          {code}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              announce('copiado');
            } catch {
              announce('falhou');
            }
          }}
          aria-label={`Copiar o código ${code}`}
          className="-mr-1 rounded-xl p-2 text-[rgb(var(--sage-ink))] transition hover:bg-[rgb(var(--sage-soft))]"
        >
          {state === 'copiado' ? (
            <Check aria-hidden="true" className="size-5" strokeWidth={3} />
          ) : (
            <Copy aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>

      <p aria-live="polite" className="min-h-4 text-[11px] font-bold text-[rgb(var(--sage-ink))]">
        {state === 'copiado' ? 'Código copiado.' : null}
        {state === 'falhou' ? 'Não foi possível copiar — selecione o código acima.' : null}
      </p>
    </div>
  );
}
