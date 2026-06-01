'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitFamily } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Select, Field, FormError, SubmitButton, SkipButton } from '../_FormPrimitives';

interface Props {
  defaults: {
    marital_status: string;
    has_children: boolean;
    children_ages: string;
    spouse_hebrew_name: string;
  };
  mode?: 'onboarding' | 'edit';
}

export function FamilyForm({ defaults, mode = 'onboarding' }: Props) {
  const t = useTranslations('onboarding');
  const [state, action] = useActionState(submitFamily, INITIAL_STATE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <Select
        label={t('family.maritalStatus')} name="marital_status"
        defaultValue={(state.values?.marital_status as string) ?? defaults.marital_status}
        error={state.errors?.marital_status}
        options={[
          ['', t('common.skipPlaceholder')],
          ['single', t('family.single')],
          ['engaged', t('family.engaged')],
          ['married', t('family.married')],
          ['divorced', t('family.divorced')],
          ['widowed', t('family.widowed')],
        ]}
      />
      <Field
        label={t('family.spouseHebrewName')} name="spouse_hebrew_name"
        defaultValue={(state.values?.spouse_hebrew_name as string) ?? defaults.spouse_hebrew_name}
        error={state.errors?.spouse_hebrew_name}
      />
      <label className="
        group flex items-center gap-3 p-4 rounded-2xl border-2 border-(--color-border) bg-white
        cursor-pointer transition-all duration-200
        hover:border-(--color-gold)/40 hover:bg-(--color-bg-muted)/50
        has-[input:checked]:bg-(--color-gold-soft)/40 has-[input:checked]:border-(--color-gold)
      ">
        <input
          type="checkbox" name="has_children"
          defaultChecked={defaults.has_children}
          className="w-5 h-5 accent-(--color-gold)"
        />
        <span className="text-sm font-medium">{t('family.hasChildren')}</span>
      </label>
      <Field
        label={t('family.childrenAges')} name="children_ages_csv"
        placeholder={t('family.childrenAgesPlaceholder')}
        defaultValue={(state.values?.children_ages_csv as string) ?? defaults.children_ages}
        error={state.errors?.children_ages_csv}
      />
      <div className="pt-4 space-y-2">
        <SubmitButton>{t('common.next')}</SubmitButton>
        <SkipButton />
      </div>
    </form>
  );
}
