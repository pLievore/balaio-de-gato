export const COMPANY_INFORMATION_LAST_VERIFIED = '2026-08-24';

export const COMPANY = {
  name: 'Papelaria Armazém Balaio de Gato',
  shortName: 'Balaio de Gato',
  legalName: 'Renei - Comercial Papelaria, Informática e Doceria Ltda.',
  taxId: '22.219.776/0001-30',
  foundedOn: '2015-04-09',
  phoneLabel: '(11) 98035-6453',
  phoneHref: 'tel:+5511980356453',
  whatsappHref: 'https://wa.me/5511980356453',
  email: 'armazembg@gmail.com',
  emailHref: 'mailto:armazembg@gmail.com',
  instagramHref: 'https://www.instagram.com/_balaiodegato01/',
  facebookHref: 'https://www.facebook.com/lojaarmazembalaiodegato',
  officialProgramHref: 'https://educacao.sme.prefeitura.sp.gov.br/kit-escolar',
  materialPortalHref:
    'https://portalmaterialescolar.sme.prefeitura.sp.gov.br/fornecedor/lojas-credenciadas',
  uniformPortalHref:
    'https://portaldeuniformes.sme.prefeitura.sp.gov.br/fornecedor/lojas-credenciadas',
} as const;

export const COMPANY_LOCATIONS = [
  {
    id: 'vila-isa',
    name: 'Unidade Sabará',
    streetAddress: 'Avenida Nossa Senhora do Sabará, 1382',
    neighborhood: 'Vila Isa',
    city: 'São Paulo',
    region: 'SP',
    postalCode: '04686-001',
    phoneLabel: '(11) 98035-6453',
    phoneHref: 'tel:+5511980356453',
    whatsappHref: 'https://wa.me/5511980356453',
    hours: ['Segunda a sexta, das 8h às 18h', 'Sábado, das 9h às 16h'],
    mapHref: 'https://www.google.com/maps/dir/?api=1&destination=-23.6670793%2C-46.6900422',
  },
  {
    id: 'jardim-pedreira',
    name: 'Unidade Alvarenga',
    streetAddress: 'Estrada do Alvarenga, 772',
    neighborhood: 'Jardim da Pedreira',
    city: 'São Paulo',
    region: 'SP',
    postalCode: '04462-000',
    phoneLabel: '(11) 91330-8379',
    phoneHref: 'tel:+5511913308379',
    whatsappHref: null,
    hours: ['Segunda a sexta, das 8h às 18h', 'Sábado, das 9h às 16h'],
    mapHref: 'https://www.google.com/maps/dir/?api=1&destination=-23.694163%2C-46.665771',
  },
  {
    id: 'jequirituba',
    name: 'Unidade Jequirituba',
    streetAddress: 'Rua Jequirituba, 1530',
    neighborhood: null,
    city: 'São Paulo',
    region: 'SP',
    postalCode: '04822-000',
    phoneLabel: '(11) 99429-0398',
    phoneHref: 'tel:+5511994290398',
    whatsappHref: null,
    hours: ['Segunda a sábado, das 8h às 19h'],
    mapHref: 'https://www.google.com/maps/dir/?api=1&destination=-23.736961%2C-46.688158',
  },
] as const;

export type CompanyLocation = (typeof COMPANY_LOCATIONS)[number];
