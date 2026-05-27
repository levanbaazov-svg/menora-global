'use client';

import { useActionState, useState } from 'react';
import { createInvitation } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import Link from 'next/link';

export function NewInvitationForm() {
  const [state, action] = useActionState(createInvitation, INITIAL_STATE);
  const [copied, setCopied] = useState(false);

  // After success: show generated link with copy button — token only ever
  // surfaces here, plaintext never hits the DB.
  if (state.ok && state.values?.token && state.values.url) {
    const url = String(state.values.url);
    const email = String(state.values.email);
    return (
      <div className="space-y-5">
        <div className="border-2 border-(--color-gold) rounded-xl p-6 bg-(--color-gold-soft)">
          <div className="font-serif text-xl font-semibold mb-2">✓ Приглашение создано</div>
          <p className="text-sm text-(--color-muted) mb-4">
            Для <strong>{email}</strong>. Скопируй ссылку и отправь напрямую — email-доставка ещё не подключена.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 border rounded-lg bg-white font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-4 py-2 rounded-lg bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
            >
              {copied ? '✓' : 'Скопировать'}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/invitations"
            className="px-5 py-2.5 rounded-full border font-semibold text-sm hover:bg-(--color-muted-bg)"
          >
            ← К списку
          </Link>
          <Link
            href="/dashboard/invitations/new"
            className="px-5 py-2.5 rounded-full bg-(--color-deep) text-white font-semibold text-sm hover:opacity-90"
          >
            + Ещё одно
          </Link>
        </div>
      </div>
    );
  }

  const v = (k: string, d = '') => (state.values?.[k] as string | undefined) ?? d;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />
      <Field
        label="Email" name="email" type="email" required
        placeholder="friend@example.com"
        defaultValue={v('email')} error={state.errors?.email}
      />
      <Select
        label="Роль" name="role" defaultValue={v('role', 'member')}
        error={state.errors?.role}
        options={[
          ['member', 'Member — обычный участник'],
          ['rabbi', 'Rabbi — может управлять общиной'],
          ['admin', 'Admin — полный контроль'],
        ]}
      />
      <Field
        label="Срок действия (дней)" name="ttl_days" type="number"
        placeholder="14" defaultValue={v('ttl_days', '14')}
        error={state.errors?.ttl_days}
      />
      <Textarea
        label="Личное сообщение (опц.)" name="message" rows={3}
        placeholder="Привет! Приглашаю тебя в нашу общину..."
        defaultValue={v('message')} error={state.errors?.message}
      />
      <div className="pt-4">
        <SubmitButton variant="gold">Создать приглашение</SubmitButton>
      </div>
    </form>
  );
}
