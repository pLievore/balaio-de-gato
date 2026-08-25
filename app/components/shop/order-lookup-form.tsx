'use client';

import { CircleAlert, PackageSearch } from 'lucide-react';
import { useActionState, useState } from 'react';

import { lookupOrder, type LookupState } from '../../(public)/pedido/actions';
import { ACCESS_TOKEN_LENGTH } from '../../../src/lib/orders/access-token';
import { buttonStyles } from '../ui/button';
import { Field, TextInput } from './field';

const INICIAL: LookupState = { status: 'idle' };

/**
 * Formulário de consulta de pedido.
 *
 * Os campos são controlados de propósito: o React 19 limpa os campos não
 * controlados de um `<form action={…}>` depois da ação, e um código recusado
 * devolveria o formulário vazio — justo para quem está copiando um código de
 * seis caracteres de um papel.
 */
export function OrderLookupForm({ codigoInicial = '' }: { codigoInicial?: string }) {
  const [state, formAction, pending] = useActionState(lookupOrder, INICIAL);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [chave, setChave] = useState('');

  const erro = state.status === 'invalid' ? state.message : undefined;

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-[rgb(var(--danger))]/35 bg-[rgb(var(--danger-soft))] p-4 text-sm font-bold text-[rgb(var(--danger))]"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {erro}
        </p>
      ) : null}

      <Field
        label="Código do pedido"
        required
        hint="Está no e-mail de confirmação, como BG-K7M2QX."
      >
        {(props) => (
          <TextInput
            {...props}
            name="codigo"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            invalid={Boolean(erro)}
            placeholder="BG-XXXXXX"
            className="uppercase"
          />
        )}
      </Field>

      <Field
        label="Chave de acompanhamento"
        hint="Opcional. Sem ela, mostramos apenas a situação do pedido — sem os seus dados pessoais."
      >
        {(props) => (
          <TextInput
            {...props}
            name="chave"
            value={chave}
            onChange={(event) => setChave(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={ACCESS_TOKEN_LENGTH + 8}
            placeholder="Cole aqui a chave que veio no e-mail"
          />
        )}
      </Field>

      <button
        type="submit"
        disabled={pending}
        className={buttonStyles({
          size: 'lg',
          className: 'mt-2 w-full sm:w-auto sm:justify-self-start',
        })}
      >
        <PackageSearch aria-hidden="true" className="size-4" />
        {pending ? 'Procurando…' : 'Ver meu pedido'}
      </button>
    </form>
  );
}
