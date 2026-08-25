import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Bricolage_Grotesque, Nunito_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { env } from '../src/config/env';
import { BRAND_MARK_PATH, BRAND_SOCIAL_PATH } from './components/brand-logo';

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

const SITE_TITLE = 'Armazém Balaio de Gato — Papelaria e Material Escolar';
const SITE_DESCRIPTION =
  'Papelaria desde 2015, com três endereços em São Paulo, compra online e credenciamento no Kit Escolar da SME/SP.';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: SITE_TITLE,
    template: '%s — Balaio de Gato',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Armazém Balaio de Gato',
  icons: {
    icon: [{ url: BRAND_MARK_PATH, type: 'image/png', sizes: '512x512' }],
    apple: [{ url: BRAND_MARK_PATH, type: 'image/png', sizes: '512x512' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Balaio de Gato',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: env.siteUrl,
    locale: 'pt_BR',
    images: [
      {
        url: BRAND_SOCIAL_PATH,
        width: 1200,
        height: 630,
        alt: 'Papelaria Armazém Balaio de Gato',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [BRAND_SOCIAL_PATH],
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
