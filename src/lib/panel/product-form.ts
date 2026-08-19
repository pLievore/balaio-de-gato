/**
 * Validação do cadastro de produto.
 *
 * Módulo puro, sem banco e sem `server-only`, para poder ser testado sozinho e
 * também usado na tela. O servidor valida de novo antes de gravar: esta camada
 * existe para dar mensagem boa a quem digita, não para ser a garantia.
 */

import { z } from 'zod';

import { CATEGORIES } from '../catalog/categories';
import { EDUCATION_STAGES } from '../program/material-escolar';

const categorySlugs = CATEGORIES.map((category) => category.slug) as [string, ...string[]];
const stageSlugs = EDUCATION_STAGES.map((stage) => stage.slug) as [string, ...string[]];

/** Converte "R$ 14,90", "14,90" ou "14.90" em centavos. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** "caderno brochura 96 folhas" → "caderno-brochura-96-folhas". */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

const priceField = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const cents = parsePriceToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: `${label} inválido. Use, por exemplo, 14,90.` });
        return z.NEVER;
      }
      return cents;
    });

export const productFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3, 'O endereço do produto precisa de ao menos 3 caracteres.')
      .max(120)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use apenas letras minúsculas, números e hífens — sem acento e sem espaço.',
      ),

    name: z.string().trim().min(3, 'Informe o nome do produto.').max(240),
    brand: z.string().trim().min(2, 'Informe a marca.').max(160),
    tagline: z
      .string()
      .trim()
      .min(3, 'A linha de apoio ajuda quem navega. Escreva uma frase curta.')
      .max(240),
    description: z.string().trim().min(20, 'Descreva o produto em ao menos 20 caracteres.'),

    status: z.enum(['draft', 'active', 'archived']),
    categorySlug: z.enum(categorySlugs, { message: 'Escolha uma categoria.' }),
    illustrationKey: z.string().trim().max(80).optional().or(z.literal('')),

    sku: z
      .string()
      .trim()
      .min(2, 'Informe o SKU.')
      .max(100)
      .regex(/^[A-Za-z0-9._-]+$/, 'O SKU aceita letras, números, ponto, hífen e sublinhado.'),

    price: priceField('Preço'),
    compareAtPrice: z
      .string()
      .trim()
      .optional()
      .transform((value, ctx) => {
        if (!value) return null;
        const cents = parsePriceToCents(value);
        if (cents === null) {
          ctx.addIssue({ code: 'custom', message: 'Preço anterior inválido.' });
          return z.NEVER;
        }
        return cents;
      }),

    maxPerOrder: z.coerce
      .number()
      .int('O limite por pedido precisa ser um número inteiro.')
      .min(1, 'O limite por pedido é de ao menos 1.')
      .max(999),

    keywords: z
      .string()
      .optional()
      .transform((value) =>
        (value ?? '')
          .split(',')
          .map((term) => term.trim())
          .filter(Boolean)
          .slice(0, 30),
      ),

    // As especificações chegam como JSON serializado pelo formulário.
    specifications: z
      .string()
      .optional()
      .transform((value, ctx) => {
        if (!value) return [] as { label: string; value: string }[];
        try {
          const parsed: unknown = JSON.parse(value);
          if (!Array.isArray(parsed)) throw new Error('não é lista');
          return parsed
            .filter(
              (entry): entry is { label: string; value: string } =>
                typeof entry === 'object' &&
                entry !== null &&
                typeof (entry as { label?: unknown }).label === 'string' &&
                typeof (entry as { value?: unknown }).value === 'string',
            )
            .map((entry) => ({ label: entry.label.trim(), value: entry.value.trim() }))
            .filter((entry) => entry.label !== '' && entry.value !== '')
            .slice(0, 20);
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Especificações em formato inválido.' });
          return z.NEVER;
        }
      }),

    stageSlugs: z
      .union([z.string(), z.array(z.string())])
      .transform((value) => (Array.isArray(value) ? value : value ? value.split(',') : []))
      .pipe(
        z
          .array(z.enum(stageSlugs))
          .min(1, 'Escolha ao menos uma etapa: sem etapa, o item não pode ser comprado com o crédito.'),
      ),
  })
  .refine(
    (data) => data.compareAtPrice === null || data.compareAtPrice > data.price,
    {
      message: 'O preço anterior precisa ser maior que o preço atual.',
      path: ['compareAtPrice'],
    },
  );

export type ProductFormData = z.output<typeof productFormSchema>;
export type ProductFieldErrors = Partial<Record<keyof ProductFormData, string>>;

export function collectProductErrors(error: z.ZodError): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as keyof ProductFormData] = issue.message;
    }
  }
  return errors;
}
