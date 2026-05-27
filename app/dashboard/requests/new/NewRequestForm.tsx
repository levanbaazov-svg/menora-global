'use client';

import { useActionState } from 'react';
import { createRequest } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { REQUEST_CATEGORIES, REQUEST_CATEGORY_LABELS, URGENCY_LABELS } from '@/lib/requests/schema';

export function NewRequestForm() {
  const [state, action] = useActionState(createRequest, INITIAL_STATE);
  const v = (k: string, d = '') => (state.values?.[k] as string | undefined) ?? d;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />
      <Select
        label="Категория *" name="category"
        defaultValue={v('category', 'other')}
        error={state.errors?.category}
        options={REQUEST_CATEGORIES.map((c) => [c, REQUEST_CATEGORY_LABELS[c]])}
      />
      <Field
        label="Заголовок *" name="title" required
        placeholder="Нужна няня в шаббат вечер 7 июня"
        defaultValue={v('title')} error={state.errors?.title}
      />
      <Textarea
        label="Подробнее *" name="body" rows={6} required
        defaultValue={v('body')} error={state.errors?.body}
        placeholder="Двое детей 4 и 7 лет, нужно с 17:00 до 22:00, район центра."
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Срочность" name="urgency"
          defaultValue={v('urgency', 'normal')}
          error={state.errors?.urgency}
          options={Object.entries(URGENCY_LABELS).map(([v, l]) => [v, l])}
        />
        <Field
          label="Истечёт через дней (0 = без срока)" name="expires_in_days" type="number"
          defaultValue={v('expires_in_days', '14')} error={state.errors?.expires_in_days}
        />
      </div>
      <div className="pt-4">
        <SubmitButton variant="gold">Опубликовать</SubmitButton>
      </div>
    </form>
  );
}
