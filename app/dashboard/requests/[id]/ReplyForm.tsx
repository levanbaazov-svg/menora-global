'use client';

import { useActionState, useState } from 'react';
import { postReply } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';

export function ReplyForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(postReply, INITIAL_STATE);
  const [contactMethod, setContactMethod] = useState<'public_thread' | 'share_phone' | 'share_email'>(
    (state.values?.contact_method as 'public_thread' | 'share_phone' | 'share_email') ?? 'public_thread',
  );

  return (
    <form action={action} className="space-y-4 border rounded-xl p-5 bg-(--color-muted-bg)">
      <input type="hidden" name="request_id" value={requestId} />
      <FormError message={state.formError} />
      <Textarea
        label="Твой ответ" name="body" rows={3} required
        defaultValue={(state.values?.body as string) ?? ''}
        placeholder="Привет! Могу помочь..."
        error={state.errors?.body}
      />
      <fieldset>
        <legend className="text-sm font-medium mb-2">Как с тобой связаться</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio" name="contact_method" value="public_thread"
              checked={contactMethod === 'public_thread'}
              onChange={() => setContactMethod('public_thread')}
            />
            <span className="text-sm">В этом треде — пусть автор напишет здесь</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio" name="contact_method" value="share_phone"
              checked={contactMethod === 'share_phone'}
              onChange={() => setContactMethod('share_phone')}
            />
            <span className="text-sm">Показать автору мой телефон</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio" name="contact_method" value="share_email"
              checked={contactMethod === 'share_email'}
              onChange={() => setContactMethod('share_email')}
            />
            <span className="text-sm">Показать автору мой email</span>
          </label>
        </div>
      </fieldset>
      {contactMethod === 'share_phone' && (
        <label className="block">
          <span className="text-sm font-medium block mb-1.5">Телефон</span>
          <input
            name="contact_phone" type="tel" required
            placeholder="+972501234567"
            defaultValue={(state.values?.contact_phone as string) ?? ''}
            className={`w-full px-4 py-2.5 border rounded-lg ${state.errors?.contact_phone ? 'border-red-500' : ''}`}
          />
          {state.errors?.contact_phone && (
            <span className="text-xs text-red-600 mt-1 block">{state.errors.contact_phone}</span>
          )}
        </label>
      )}
      {contactMethod === 'share_email' && (
        <label className="block">
          <span className="text-sm font-medium block mb-1.5">Email</span>
          <input
            name="contact_email" type="email" required
            defaultValue={(state.values?.contact_email as string) ?? ''}
            className={`w-full px-4 py-2.5 border rounded-lg ${state.errors?.contact_email ? 'border-red-500' : ''}`}
          />
          {state.errors?.contact_email && (
            <span className="text-xs text-red-600 mt-1 block">{state.errors.contact_email}</span>
          )}
        </label>
      )}
      <div className="pt-2">
        <SubmitButton>Ответить</SubmitButton>
      </div>
    </form>
  );
}
