'use client';

import { useActionState } from 'react';
import { submitInterests } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { ChipCheckboxes, Textarea, FormError, SubmitButton, SkipButton } from '../_FormPrimitives';
import { INTERESTS, LANGUAGES } from '@/lib/onboarding/schema';

const INTEREST_LABELS: Record<typeof INTERESTS[number], string> = {
  torah_learning: 'Тора / учёба', prayer: 'Молитва', social: 'Общение',
  volunteering: 'Волонтёрство', parenting: 'Дети', sports: 'Спорт',
  music: 'Музыка', cooking: 'Кулинария', hebrew: 'Иврит',
  israel: 'Израиль', arts: 'Искусство', outdoors: 'Природа', meditation: 'Медитация',
};
const LANG_LABELS: Record<typeof LANGUAGES[number], string> = {
  en: 'English', he: 'עברית', ru: 'Русский', fr: 'Français',
  es: 'Español', de: 'Deutsch', yi: 'ייִדיש',
};

interface Props {
  defaults: { interests: string[]; languages: string[]; bio: string };
  mode?: 'onboarding' | 'edit';
}

export function InterestsForm({ defaults, mode = 'onboarding' }: Props) {
  const [state, action] = useActionState(submitInterests, INITIAL_STATE);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <ChipCheckboxes label="Интересы" name="interests"
                      defaultValues={defaults.interests}
                      options={INTERESTS} labels={INTEREST_LABELS} />
      <ChipCheckboxes label="Языки" name="languages"
                      defaultValues={defaults.languages}
                      options={LANGUAGES} labels={LANG_LABELS} />
      <Textarea label="Коротко о себе" name="bio"
                rows={4}
                defaultValue={(state.values?.bio as string) ?? defaults.bio}
                placeholder="Что хотел бы рассказать другим членам общины?"
                error={state.errors?.bio} />
      <div className="pt-4 space-y-2">
        <SubmitButton>Дальше</SubmitButton>
        <SkipButton />
      </div>
    </form>
  );
}
