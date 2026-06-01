'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitReligious } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { RadioGroup, FormError, SubmitButton } from '../_FormPrimitives';

interface Props {
  defaults: { denomination: string; observance_level: string; kashrut_level: string };
  mode?: 'onboarding' | 'edit';
}

export function ReligiousForm({ defaults, mode = 'onboarding' }: Props) {
  const t = useTranslations('onboarding');
  const [state, action] = useActionState(submitReligious, INITIAL_STATE);
  const v = (k: keyof typeof defaults) => (state.values?.[k] as string | undefined) ?? defaults[k];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <RadioGroup label={t('religious.denomination')} name="denomination"
                  defaultValue={v('denomination')} error={state.errors?.denomination}
                  options={[
                    ['reform', 'Reform'],
                    ['conservative', 'Conservative'],
                    ['modern_orthodox', 'Modern Orthodox'],
                    ['orthodox', 'Orthodox'],
                    ['chabad', 'Chabad'],
                    ['sephardi', 'Sephardi'],
                    ['reconstructionist', 'Reconstructionist'],
                    ['secular', 'Secular'],
                    ['other', t('religious.denominationOther')],
                  ]} />
      <RadioGroup label={t('religious.observanceLevel')} name="observance_level"
                  defaultValue={v('observance_level')} error={state.errors?.observance_level}
                  options={[
                    ['curious', t('religious.observanceCurious')],
                    ['traditional', t('religious.observanceTraditional')],
                    ['observant', t('religious.observanceObservant')],
                    ['strictly_observant', t('religious.observanceStrict')],
                  ]} />
      <RadioGroup label={t('religious.kashrut')} name="kashrut_level"
                  defaultValue={v('kashrut_level')} error={state.errors?.kashrut_level}
                  options={[
                    ['none', t('religious.kashrutNone')],
                    ['basic', t('religious.kashrutBasic')],
                    ['strict', t('religious.kashrutStrict')],
                    ['mehadrin', t('religious.kashrutMehadrin')],
                  ]} />
      <div className="pt-4">
        <SubmitButton>{t('common.next')}</SubmitButton>
      </div>
    </form>
  );
}
