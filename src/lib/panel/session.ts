import 'server-only';

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'panel_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  const value = process.env.ADMIN_PANEL_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('ADMIN_PANEL_SESSION_SECRET is not configured');
  }
  return value;
}

function sign(expiresAt: number): string {
  return createHmac('sha256', secret()).update(String(expiresAt)).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export function verifyPanelPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PANEL_PASSWORD ?? '';
  return expected.length >= 8 && safeEqual(candidate, expected);
}

export async function createPanelSession() {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyPanelSession() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: '/admin' });
}

export async function hasValidPanelSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return false;

  const [expiry, signature] = raw.split('.');
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) {
    return false;
  }
  return safeEqual(signature, sign(expiresAt));
}
