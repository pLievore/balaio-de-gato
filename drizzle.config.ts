import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Next.js loads .env.local automatically, but drizzle-kit does not.
loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

const configuredDatabaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error(
    'Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL before running drizzle-kit.',
  );
}

const databaseUrl = new URL(configuredDatabaseUrl);
if (databaseUrl.searchParams.get('sslmode') === 'require') {
  databaseUrl.searchParams.set('sslmode', 'verify-full');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl.toString(),
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
