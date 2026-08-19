'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { loginAction } from './actions';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin/products';
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[rgb(var(--bg))] px-5">
      <div className="w-full max-w-sm rounded-3xl border border-[rgb(var(--border))] bg-white p-8 text-center">
        <span className="relative mx-auto block size-14 overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
          <Image
            src="/brand/icon-512x512.png"
            alt=""
            fill
            sizes="56px"
            className="object-contain p-1.5"
          />
        </span>
        <h1 className="font-display mt-5 text-3xl tracking-tight">
          Team <span className="italic">panel</span>
        </h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Restricted access for 801 Outlet staff.
        </p>

        <form action={formAction} className="mt-6 space-y-4 text-left">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold">
              Password
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
            {pending ? 'Signing in…' : 'Sign in'}
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
