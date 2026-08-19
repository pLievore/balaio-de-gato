import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { hasValidPanelSession } from '../../src/lib/panel/session';
import { logoutAction } from './login/actions';
import { AdminShell } from './_components/admin-shell';

export const metadata: Metadata = {
  title: 'Painel — Balaio de Gato',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isLogin = pathname === '/admin/login';

  const authenticated = await hasValidPanelSession();
  if (!authenticated && !isLogin) {
    // The proxy already redirects cookie-less requests; this covers
    // invalid/expired signatures.
    redirect('/admin/login');
  }

  if (!authenticated) {
    return <>{children}</>;
  }

  return <AdminShell signOut={logoutAction}>{children}</AdminShell>;
}
