import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Reads the Supabase access token from the cookies set by the browser client.
 * Returns the user if the token is valid, null otherwise.
 */
export async function getServerSession() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  // Find the supabase auth token cookie (format: sb-<project-ref>-auth-token)
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find((c) => c.name.endsWith('-auth-token'));
  if (!authCookie) return null;

  let accessToken: string | null = null;
  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    accessToken = Array.isArray(parsed) ? parsed[0] : (parsed?.access_token ?? null);
  } catch {
    return null;
  }

  if (!accessToken) return null;

  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
  } = await client.auth.getUser(accessToken);
  return user ?? null;
}
