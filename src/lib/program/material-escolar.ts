export const MATERIAL_ESCOLAR_YEAR = 2026;

export const MATERIAL_ESCOLAR_SOURCE = 'https://educacao.sme.prefeitura.sp.gov.br/kit-escolar/';

export type EducationStage = {
  slug: string;
  shortName: string;
  name: string;
  range: string;
  benefitAmountInCents: number;
  accent: 'coral' | 'sun' | 'teal' | 'blue';
};

/**
 * Valores publicados pela SME para o Programa Material Escolar de 2026.
 * Eles representam o auxílio por etapa, não o preço de um produto ou a
 * confirmação do saldo individual do responsável.
 */
export const EDUCATION_STAGES: readonly EducationStage[] = [
  {
    slug: 'bercario',
    shortName: 'Berçário I e II',
    name: 'Educação Infantil — Berçário I e II',
    range: 'Educação Infantil',
    benefitAmountInCents: 14_997,
    accent: 'coral',
  },
  {
    slug: 'mini-grupo',
    shortName: 'Mini Grupo Unificado',
    name: 'Educação Infantil — Mini Grupo Unificado',
    range: 'Educação Infantil',
    benefitAmountInCents: 21_722,
    accent: 'sun',
  },
  {
    slug: 'infantil',
    shortName: 'Infantil Unificado',
    name: 'Educação Infantil — Infantil Unificado',
    range: 'Educação Infantil',
    benefitAmountInCents: 26_413,
    accent: 'teal',
  },
  {
    slug: 'alfabetizacao',
    shortName: '1º ao 3º ano',
    name: '1º ao 3º ano do Ensino Fundamental',
    range: 'Ensino Fundamental',
    benefitAmountInCents: 34_617,
    accent: 'blue',
  },
  {
    slug: 'interdisciplinar',
    shortName: '4º ao 6º ano',
    name: '4º ao 6º ano do Ensino Fundamental',
    range: 'Ensino Fundamental',
    benefitAmountInCents: 42_292,
    accent: 'coral',
  },
  {
    slug: 'autoral',
    shortName: '7º ao 9º ano',
    name: '7º ao 9º ano do Ensino Fundamental',
    range: 'Ensino Fundamental',
    benefitAmountInCents: 40_204,
    accent: 'sun',
  },
  {
    slug: 'ensino-medio',
    shortName: 'Ensino Médio',
    name: 'Ensino Médio',
    range: '1ª à 3ª série',
    benefitAmountInCents: 38_159,
    accent: 'teal',
  },
  {
    slug: 'eja-mova',
    shortName: 'EJA e MOVA',
    name: 'Educação de Jovens e Adultos',
    range: 'Jovens e adultos',
    benefitAmountInCents: 34_953,
    accent: 'blue',
  },
  {
    slug: 'celps',
    shortName: 'Curso de línguas',
    name: 'Centros de Estudos de Línguas Paulistanos',
    range: 'CELPs',
    benefitAmountInCents: 15_435,
    accent: 'coral',
  },
] as const;

export function getEducationStage(slug: string | undefined) {
  if (!slug) return undefined;
  return EDUCATION_STAGES.find((stage) => stage.slug === slug);
}

/**
 * Reexportado de `lib/money`, que é onde o formato de moeda mora. O nome
 * segue disponível aqui porque as páginas do programa já o importam deste
 * módulo junto com os valores das etapas.
 */
export { formatBRL } from '../money';
