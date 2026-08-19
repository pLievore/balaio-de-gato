import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Bricolage_Grotesque, Nunito_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { env } from '../src/config/env';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito-sans',
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage-grotesque',
});

const SITE_TITLE = 'Balaio de Gato — Papelaria e Material Escolar';
const SITE_DESCRIPTION =
  'Materiais escolares para todas as idades, com compra online e pagamento pelo crédito do Kit Escolar.';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: SITE_TITLE,
    template: '%s — Balaio de Gato',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Balaio de Gato',
  icons: { icon: '/brand/balaio-mark.svg' },
  openGraph: {
    type: 'website',
    siteName: 'Balaio de Gato',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: env.siteUrl,
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunitoSans.variable} ${bricolageGrotesque.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
