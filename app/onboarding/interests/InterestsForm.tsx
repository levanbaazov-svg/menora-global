'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitInterests } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { ChipCheckboxes, Textarea, FormError, SubmitButton, SkipButton } from '../_FormPrimitives';
import { INTERESTS, LANGUAGES } from '@/lib/onboarding/schema';

const LANG_LABELS: Record<typeof LANGUAGES[number], string> = {
  en: 'English', he: 'עברית', ru: 'Русский', fr: 'Français',
  es: 'Español', de: 'Deutsch', yi: 'ייִדיש',
};

interface Props {
  defaults: { interests: string[]; languages: string[]; bio: string };
  mode?: 'onboarding' | 'edit';
}

export function InterestsForm({ defaults, mode = 'onboarding' }: Props) {
  const t = useTranslations('onboarding');
  const [state, action] = useActionState(submitInterests, INITIAL_STATE);
  const INTEREST_LABELS = Object.fromEntries(
    INTERESTS.map((k) => [k, t(`interests.i_${k}`)]),
  ) as Record<typeof INTERESTS[number], string>;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <ChipCheckboxes label={t('interests.interests')} name="interests"
                      defaultValues={defaults.interests}
                      options={INTERESTS} labels={INTEREST_LABELS} />
      <ChipCheckboxes label={t('interests.languages')} name="languages"
                      defaultValues={defaults.languages}
                      options={LANGUAGES} labels={LANG_LABELS} />
      <Textarea label={t('interests.bio')} name="bio"
                rows={4}
                defaultValue={(state.values?.bio as string) ?? defaults.bio}
                placeholder={t('interests.bioPlaceholder')}
                error={state.errors?.bio} />
      <div className="pt-4 space-y-2">
        <SubmitButton>{t('common.next')}</SubmitButton>
        <SkipButton />
      </div>
    </form>
  );
}
