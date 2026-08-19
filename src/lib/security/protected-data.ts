import 'server-only';

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

function masterSecret(): string {
  const explicit = process.env.ORDER_DATA_ENCRYPTION_KEY?.trim();
  if (explicit) return explicit;

  // Compatibilidade temporária para o ambiente local enquanto o segredo
  // dedicado ainda não foi criado. A implantação pública deve sempre definir
  // ORDER_DATA_ENCRYPTION_KEY separadamente.
  const localFallback = process.env.ADMIN_PANEL_SESSION_SECRET?.trim();
  if (localFallback && !process.env.VERCEL_ENV) return localFallback;

  throw new Error('ORDER_DATA_ENCRYPTION_KEY não está configurada.');
}

function deriveKey(purpose: 'encryption' | 'lookup'): Buffer {
  return createHmac('sha256', masterSecret())
    .update(`balaio-de-gato:order-data:${purpose}:v1`)
    .digest();
}

export function protectJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey('encryption'), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(
    '.',
  );
}

export function revealJson<T>(payload: string): T {
  const [version, encodedIv, encodedTag, encodedData, ...extra] = payload.split('.');
  if (
    version !== VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedData ||
    extra.length > 0
  ) {
    throw new Error('Formato de dado protegido inválido.');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey('encryption'),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encodedData, 'base64url')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8')) as T;
}

/** Índice irreversível para detectar o mesmo CPF sem armazená-lo em texto. */
export function protectedLookup(value: string): string {
  return createHmac('sha256', deriveKey('lookup')).update(value).digest('hex');
}
