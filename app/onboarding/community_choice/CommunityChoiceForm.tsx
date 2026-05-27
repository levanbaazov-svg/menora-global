'use client';

import { useActionState } from 'react';
import { submitCommunityChoice } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Textarea, FormError, SubmitButton } from '../_FormPrimitives';

interface Community { id: string; slug: string; name: string; city: string | null; country_code: string | null; }

export function CommunityChoiceForm({ communities }: { communities: Community[] }) {
  const [state, action] = useActionState(submitCommunityChoice, INITIAL_STATE);
  const selected = state.values?.community_id as string | undefined;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />
      <p className="text-sm text-(--color-muted) mb-4">
        Выбери общину, к которой хочешь присоединиться. Раввин рассмотрит заявку.
      </p>
      <fieldset className={`space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3 ${
        state.errors?.community_id ? 'border-red-500' : ''
      }`}>
        <legend className="sr-only">Община</legend>
        {communities.length === 0 ? (
          <p className="text-sm text-(--color-muted) p-4 text-center">
            Пока нет общин. Подожди приглашения.
          </p>
        ) : communities.map((c) => (
          <label key={c.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-(--color-muted-bg)">
            <input type="radio" name="community_id" value={c.id} defaultChecked={selected === c.id} className="mt-1 w-4 h-4" />
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-(--color-muted) mt-0.5">
                {[c.city, c.country_code].filter(Boolean).join(', ') || c.slug}
              </div>
            </div>
          </label>
        ))}
      </fieldset>
      {state.errors?.community_id && <span className="text-xs text-red-600 block">{state.errors.community_id}</span>}
      <Textarea label="Почему хочешь присоединиться? *" name="request_message" rows={4}
                defaultValue={(state.values?.request_message as string) ?? ''}
                placeholder="Раввин увидит это сообщение при рассмотрении заявки..."
                error={state.errors?.request_message} />
      <div className="pt-4">
        <SubmitButton>Подать заявку</SubmitButton>
      </div>
    </form>
  );
}
