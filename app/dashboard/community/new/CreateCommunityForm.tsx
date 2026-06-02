'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createCommunity } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';

export function CreateCommunityForm() {
  const t = useTranslations('communityPages.newCommunity');
  const [state, action] = useActionState(createCommunity, INITIAL_STATE);
  const v = (k: string, d = '') => (state.values?.[k] as string | undefined) ?? d;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      <Field label={t('nameLabel')} name="name" required
        placeholder={t('namePlaceholder')} defaultValue={v('name')} error={state.errors?.name} />

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('cityLabel')} name="city" required defaultValue={v('city')} error={state.errors?.city} />
        <Field label={t('countryLabel')} name="country_code" required
          placeholder={t('countryPlaceholder')} defaultValue={v('country_code')} error={state.errors?.country_code} />
      </div>

      <Field label={t('timezoneLabel')} name="timezone" required
        placeholder={t('timezonePlaceholder')} defaultValue={v('timezone')} error={state.errors?.timezone} />

      <Field label={t('denominationLabel')} name="denomination"
        placeholder="Chabad" defaultValue={v('denomination', 'Chabad')} error={state.errors?.denomination} />

      <Textarea label={t('descriptionLabel')} name="description" rows={4}
        defaultValue={v('description')} error={state.errors?.description} />

      <div className="pt-4">
        <SubmitButton variant="gold">{t('submit')}</SubmitButton>
        <p className="text-xs text-(--color-fg-muted) mt-3">{t('submitHint')}</p>
      </div>
    </form>
  );
}
