'use server';

import { redirect } from 'next/navigation';

import {
  createPanelSession,
  destroyPanelSession,
  verifyPanelPassword,
} from '../../../src/lib/panel/session';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, recent);
  if (recent.length >= MAX_ATTEMPTS) return true;
  recent.push(now);
  return false;
}

export async function loginAction(
  _previous: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const password =
    typeof formData.get('password') === 'string' ? (formData.get('password') as string) : '';
  const next =
    typeof formData.get('next') === 'string' ? (formData.get('next') as string) : '/admin';

  if (isRateLimited('panel-login')) {
    return { error: 'Too many attempts. Try again in a few minutes.' };
  }

  if (!verifyPanelPassword(password)) {
    return { error: 'Incorrect password.' };
  }

  await createPanelSession();
  redirect(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}

export async function logoutAction() {
  await destroyPanelSession();
  redirect('/admin/login');
}
