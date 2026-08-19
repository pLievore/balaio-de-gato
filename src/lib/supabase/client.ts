import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cliente Supabase anônimo — legado do painel `/admin`.
 *
 * Criação preguiçosa pelo mesmo motivo de `./admin`: lançar erro no import
 * fazia o `next build` falhar por inteiro num ambiente sem as chaves do
 * legado, mesmo o storefront público não usando Supabase em rota nenhuma.
 * O erro passa a acontecer no primeiro uso real.
 */

type AnonClient = SupabaseClient<Database>;

let client: AnonClient | null = null;

function getClient(): AnonClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set them in .env.local — see ENV.md.'
    );
  }

  client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

export const supabase = new Proxy({} as AnonClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});
