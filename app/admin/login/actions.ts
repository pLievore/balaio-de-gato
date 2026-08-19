'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  createPanelSession,
  destroyPanelSession,
  verifyPanelPassword,
} from '../../../src/lib/panel/session';
import {
  clearRateLimit,
  consumeRateLimit,
  requestIdentifier,
} from '../../../src/lib/security/rate-limit';

export async function loginAction(
  _previous: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const password =
    typeof formData.get('password') === 'string' ? (formData.get('password') as string) : '';
  const next =
    typeof formData.get('next') === 'string' ? (formData.get('next') as string) : '/admin';

  // Contagem por origem e no banco. O contador em memória que existia aqui
  // não valia nada em serverless — cada instância nova começava do zero — e
  // ainda era global, então uma tentativa errada de fora bloqueava a loja.
  const identity = requestIdentifier(await headers());
  const verdict = await consumeRateLimit('panelLogin', identity);
  if (!verdict.allowed) {
    const minutos = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      error: `Tentativas demais. Espere ${minutos === 1 ? 'um minuto' : `${minutos} minutos`}.`,
    };
  }

  if (!verifyPanelPassword(password)) {
    return { error: 'Senha incorreta.' };
  }

  // Acertou: devolve a cota, para que quem digitou errado antes não fique
  // com o resto da janela pela metade.
  await clearRateLimit('panelLogin', identity);
  await createPanelSession();
  redirect(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}

export async function logoutAction() {
  await destroyPanelSession();
  redirect('/admin/login');
}
