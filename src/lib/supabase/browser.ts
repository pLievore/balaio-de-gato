'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cookie-based storage adapter so the session is visible to server-side
 * middleware and Server Components (which cannot read localStorage).
 */
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find((row) => row.startsWith(key + '='));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    // 7-day expiry, accessible to all paths, SameSite=Lax (no HttpOnly so JS can read it)
    document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=604800;SameSite=Lax`;
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=;path=/;max-age=0;SameSite=Lax`;
  },
};

let _client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Browser-side Supabase client with cookie-based session persistence.
 * Cookies are readable by middleware and Server Components.
 * Use only in Client Components.
 */
export function getSupabaseBrowser() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars');
  }
  _client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: cookieStorage,
    },
  });
  return _client;
}
