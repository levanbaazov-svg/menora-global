'use client';

import { useActionState } from 'react';
import { submitReligious } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { RadioGroup, FormError, SubmitButton } from '../_FormPrimitives';

interface Props {
  defaults: { denomination: string; observance_level: string; kashrut_level: string };
  mode?: 'onboarding' | 'edit';
}

export function ReligiousForm({ defaults, mode = 'onboarding' }: Props) {
  const [state, action] = useActionState(submitReligious, INITIAL_STATE);
  const v = (k: keyof typeof defaults) => (state.values?.[k] as string | undefined) ?? defaults[k];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <RadioGroup label="Направление *" name="denomination"
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
                    ['other', 'Другое'],
                  ]} />
      <RadioGroup label="Уровень соблюдения *" name="observance_level"
                  defaultValue={v('observance_level')} error={state.errors?.observance_level}
                  options={[
                    ['curious', 'Только интересуюсь'],
                    ['traditional', 'Традиционный'],
                    ['observant', 'Соблюдающий'],
                    ['strictly_observant', 'Строго соблюдающий'],
                  ]} />
      <RadioGroup label="Кашрут *" name="kashrut_level"
                  defaultValue={v('kashrut_level')} error={state.errors?.kashrut_level}
                  options={[
                    ['none', 'Не соблюдаю'],
                    ['basic', 'Базовый'],
                    ['strict', 'Строгий'],
                    ['mehadrin', 'Мехадрин'],
                  ]} />
      <div className="pt-4">
        <SubmitButton>Дальше</SubmitButton>
      </div>
    </form>
  );
}
