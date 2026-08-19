/**
 * Dados do pedido do benefício.
 *
 * Duas regras do programa moldam este formulário:
 *
 * 1. O documento fiscal sai no CPF do responsável, então o CPF é obrigatório e
 *    validado no dígito verificador.
 * 2. A entrega não pode ser cobrada da família nem endereçada a escola, DRE ou
 *    unidade da SME — por isso o endereço é residencial e o texto do formulário
 *    diz isso antes de a pessoa digitar.
 *
 * E uma regra de segurança: nada aqui coleta senha nem código do cartão
 * virtual. Se um campo desses aparecer neste arquivo algum dia, é um bug de
 * conformidade, não uma melhoria de conversão.
 */

import { z } from 'zod';

import { EDUCATION_STAGES } from '../program/material-escolar';
import { isValidCEP, isValidCPF, isValidPhone, stripCEP, stripCPF, stripPhone } from './cpf';

const stageSlugs = EDUCATION_STAGES.map((stage) => stage.slug) as [string, ...string[]];

/**
 * Termos que indicam entrega em endereço escolar ou da administração. A regra
 * do programa proíbe destinar a compra a esses locais, então a checagem
 * acontece antes de o pedido existir, com uma mensagem que explica o porquê.
 */
const ENDERECO_INSTITUCIONAL =
  /\b(emei|emef|ceu|ceei|cei\b|dre|sme|escola|creche|secretaria municipal)\b/i;

export const orderFormSchema = z.object({
  responsavelNome: z
    .string()
    .trim()
    .min(5, 'Informe o nome completo do responsável.')
    .max(120, 'Nome muito longo.')
    .refine((value) => value.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),

  responsavelCpf: z
    .string()
    .transform(stripCPF)
    .refine((value) => value.length === 11, 'O CPF precisa ter 11 dígitos.')
    .refine(isValidCPF, 'Confira o CPF: os dígitos não conferem.'),

  email: z
    .string()
    .trim()
    .min(1, 'Informe um e-mail para receber o andamento do pedido.')
    .email('Confira o e-mail digitado.')
    .max(160),

  telefone: z.string().transform(stripPhone).refine(isValidPhone, 'Informe um telefone com DDD.'),

  etapa: z.enum(stageSlugs, { message: 'Escolha o ano ou a etapa do estudante.' }),

  cep: z.string().transform(stripCEP).refine(isValidCEP, 'O CEP precisa ter 8 dígitos.'),

  logradouro: z
    .string()
    .trim()
    .min(3, 'Informe a rua ou avenida.')
    .max(160)
    .refine(
      (value) => !ENDERECO_INSTITUCIONAL.test(value),
      'A entrega do benefício não pode ser feita em escola, DRE ou unidade da SME. Informe o endereço residencial.',
    ),

  numero: z.string().trim().min(1, 'Informe o número.').max(20),

  complemento: z.string().trim().max(80).optional().or(z.literal('')),

  bairro: z.string().trim().min(2, 'Informe o bairro.').max(80),

  cidade: z.string().trim().min(2, 'Informe a cidade.').max(80),

  uf: z
    .string()
    .trim()
    .length(2, 'Use a sigla do estado, com 2 letras.')
    .transform((value) => value.toUpperCase()),

  observacoes: z.string().trim().max(500).optional().or(z.literal('')),

  aceiteRegras: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .refine((value) => value === 'on' || value === 'true' || value === true, {
      message: 'É preciso confirmar as regras do programa para enviar o pedido.',
    }),
});

export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormData = z.output<typeof orderFormSchema>;

/** Erros por campo, no formato que o formulário sabe exibir. */
export type FieldErrors = Partial<Record<keyof OrderFormData, string>>;

export function collectFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as keyof OrderFormData] = issue.message;
    }
  }
  return errors;
}
