'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createRequest } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { REQUEST_CATEGORIES, URGENCY_LABELS } from '@/lib/requests/schema';

export function NewRequestForm() {
  const t = useTranslations('requestsPage.new');
  const tReq = useTranslations('requests');
  const [state, action] = useActionState(createRequest, INITIAL_STATE);
  const v = (k: string, d = '') => (state.values?.[k] as string | undefined) ?? d;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />
      <Select
        label={t('categoryLabel')} name="category"
        defaultValue={v('category', 'other')}
        error={state.errors?.category}
        options={REQUEST_CATEGORIES.map((c) => [c, tReq(`categories.${c}`)])}
      />
      <Field
        label={t('titleLabel')} name="title" required
        placeholder={t('titlePlaceholder')}
        defaultValue={v('title')} error={state.errors?.title}
      />
      <Textarea
        label={t('bodyLabel')} name="body" rows={6} required
        defaultValue={v('body')} error={state.errors?.body}
        placeholder={t('bodyPlaceholder')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('urgencyLabel')} name="urgency"
          defaultValue={v('urgency', 'normal')}
          error={state.errors?.urgency}
          options={(Object.keys(URGENCY_LABELS) as (keyof typeof URGENCY_LABELS)[]).map((k) => [k, tReq(`urgency.${k}`)])}
        />
        <Field
          label={t('expiresLabel')} name="expires_in_days" type="number"
          defaultValue={v('expires_in_days', '14')} error={state.errors?.expires_in_days}
        />
      </div>
      <div className="pt-4">
        <SubmitButton variant="gold">{t('submit')}</SubmitButton>
      </div>
    </form>
  );
}
