/**
 * Chave de acompanhamento do pedido.
 *
 * O código público (BG-XXXXXX) serve para o atendimento e cabe num bilhete:
 * seis caracteres, fácil de ditar por telefone. Justamente por isso ele não
 * pode ser a única coisa entre um estranho e o nome, o CPF mascarado e o
 * endereço residencial de uma família.
 *
 * A chave aqui é o segundo fator: longa, sorteada e enviada só a quem fez o
 * pedido. Sem ela a página mostra apenas a situação; com ela, tudo.
 *
 * Este módulo é puro de propósito — não toca no banco, para poder ser testado
 * sem conexão. A gravação fica em `repository.ts`.
 */

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Alfabeto sem os pares que se confundem à mão (0/O, 1/I/L, U/V).
 * A chave chega por e-mail, mas pode ser lida em voz alta no atendimento.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTWXYZ';

/** 32 caracteres neste alfabeto passam de 155 bits — fora de alcance de varredura. */
export const ACCESS_TOKEN_LENGTH = 32;

/** Validade da chave. Um pedido do programa se resolve em semanas, não em anos. */
export const ACCESS_TOKEN_TTL_DAYS = 180;

export function generateAccessToken(): string {
  let token = '';
  for (let index = 0; index < ACCESS_TOKEN_LENGTH; index += 1) {
    token += ALPHABET[randomInt(ALPHABET.length)];
  }
  return token;
}

/**
 * Normaliza o que veio da URL.
 *
 * Quem copia de um e-mail traz espaço, quebra de linha e caixa trocada. Nada
 * disso deveria custar uma consulta perdida.
 */
export function normalizeAccessToken(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function isAccessToken(value: string): boolean {
  if (value.length !== ACCESS_TOKEN_LENGTH) return false;
  for (const character of value) {
    if (!ALPHABET.includes(character)) return false;
  }
  return true;
}

/**
 * O que vai para o banco.
 *
 * Guardar o resumo, e não a chave, mantém quem tiver acesso de leitura ao
 * banco sem poder abrir os pedidos dos clientes.
 */
export function hashAccessToken(token: string): string {
  return createHash('sha256').update(`balaio-de-gato:order-access:${token}`).digest('hex');
}

/** Comparação em tempo constante entre dois resumos. */
export function accessTokenHashMatches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** Endereço de acompanhamento com a chave embutida. */
export function orderTrackingPath(code: string, token?: string | null): string {
  const base = `/pedido/${encodeURIComponent(code)}`;
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}

export function accessTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
