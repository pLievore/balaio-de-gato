'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { loginAction } from './actions';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[rgb(var(--bg))] px-5">
      <div className="w-full max-w-sm rounded-3xl border border-[rgb(var(--border))] bg-white p-8 text-center">
        <span className="relative mx-auto block size-14 overflow-hidden rounded-2xl">
          <Image src="/brand/balaio-mark.svg" alt="" fill sizes="56px" priority />
        </span>
        <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight">
          Painel da <span className="text-[rgb(var(--accent))]">loja</span>
        </h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Acesso restrito à equipe da Balaio de Gato.
        </p>

        <form action={formAction} className="mt-6 space-y-4 text-left">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-11 w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white px-4 text-sm transition outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15"
            />
          </div>
          {state.error ? (
            <p role="alert" className="text-xs font-semibold text-[rgb(var(--accent))]">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-full bg-[rgb(var(--fg))] text-sm font-semibold text-white transition hover:bg-[rgb(var(--fg))]/90 disabled:opacity-60"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
