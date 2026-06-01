'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitIdentity } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, FormError, SubmitButton } from '../_FormPrimitives';

interface Props {
  defaults: {
    legal_first_name: string;
    legal_last_name: string;
    hebrew_name: string;
    gender: string;
    date_of_birth: string;
    phone_e164: string;
  };
  mode?: 'onboarding' | 'edit';
}

export function IdentityForm({ defaults, mode = 'onboarding' }: Props) {
  const t = useTranslations('onboarding');
  const [state, action] = useActionState(submitIdentity, INITIAL_STATE);
  const v = (k: keyof typeof defaults) =>
    (state.values?.[k] as string | undefined) ?? defaults[k];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('identity.firstName')} name="legal_first_name" required defaultValue={v('legal_first_name')} error={state.errors?.legal_first_name} />
        <Field label={t('identity.lastName')} name="legal_last_name" required defaultValue={v('legal_last_name')} error={state.errors?.legal_last_name} />
      </div>
      <Field label={t('identity.hebrewName')} name="hebrew_name" required
             placeholder={t('identity.hebrewNamePlaceholder')} defaultValue={v('hebrew_name')}
             error={state.errors?.hebrew_name} />
      <div className="grid grid-cols-2 gap-4">
        <Select label={t('identity.gender')} name="gender" required defaultValue={v('gender')}
                error={state.errors?.gender}
                options={[
                  ['', t('common.selectPlaceholder')],
                  ['male', t('identity.genderMale')],
                  ['female', t('identity.genderFemale')],
                  ['other', t('identity.genderOther')],
                  ['prefer_not_say', t('identity.genderPreferNotSay')],
                ]} />
        <Field label={t('identity.dateOfBirth')} name="date_of_birth" type="date" required
               defaultValue={v('date_of_birth')} error={state.errors?.date_of_birth} />
      </div>
      <Field label={t('identity.phone')} name="phone_e164" required
             placeholder={t('identity.phonePlaceholder')}
             defaultValue={v('phone_e164')} error={state.errors?.phone_e164} />
      <div className="pt-4">
        <SubmitButton>{t('common.next')}</SubmitButton>
      </div>
    </form>
  );
}
