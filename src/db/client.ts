import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error('DATABASE_URL is not configured.');
  }

  // pg v8 interpreta `require` como verificação completa, mas essa semântica
  // mudará no pg v9. Tornamos a intenção explícita sem alterar o segredo salvo.
  const url = new URL(value);
  if (url.searchParams.get('sslmode') === 'require') {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

type DatabaseGlobal = typeof globalThis & {
  __balaioDatabasePool?: Pool;
};

const databaseGlobal = globalThis as DatabaseGlobal;

/**
 * Keep one pool during Next.js development reloads. In production the module
 * cache provides the same one-pool-per-process behavior.
 */
export const pool =
  databaseGlobal.__balaioDatabasePool ??
  new Pool({
    connectionString: requireDatabaseUrl(),
    application_name: 'balaio-de-gato',
    max: process.env.NODE_ENV === 'production' ? 5 : 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== 'production') {
  databaseGlobal.__balaioDatabasePool = pool;
}

export const db = drizzle(pool, { schema });
