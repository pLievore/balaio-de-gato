import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cliente Supabase com service role — legado do painel `/admin`.
 *
 * A criação é preguiçosa de propósito. Antes, este módulo lançava erro só de
 * ser importado quando faltava variável de ambiente, e isso derrubava o
 * `next build` inteiro na etapa de coleta de dados das rotas: o storefront
 * público não usa Supabase, mas bastava a rota do webhook existir para o build
 * falhar num ambiente sem as chaves do legado.
 *
 * Agora o erro acontece no primeiro uso real. Quem chama continua escrevendo
 * `supabaseAdmin.from(...)` sem mudança.
 */

type AdminClient = SupabaseClient<Database>;

let client: AdminClient | null = null;

function getClient(): AdminClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set them in .env.local — see ENV.md.'
    );
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

// O service role ignora RLS. Nunca importe de um Client Component.
export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});
