'use client';

import { useActionState } from 'react';
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
  const [state, action] = useActionState(submitFamily, INITIAL_STATE);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <Select
        label="Семейный статус" name="marital_status"
        defaultValue={(state.values?.marital_status as string) ?? defaults.marital_status}
        error={state.errors?.marital_status}
        options={[
          ['', '— пропустить —'],
          ['single', 'Не женат / не замужем'],
          ['engaged', 'Помолвлен(-а)'],
          ['married', 'Женат / замужем'],
          ['divorced', 'В разводе'],
          ['widowed', 'Вдовец / вдова'],
        ]}
      />
      <Field
        label="Еврейское имя супруга (опц.)" name="spouse_hebrew_name"
        defaultValue={(state.values?.spouse_hebrew_name as string) ?? defaults.spouse_hebrew_name}
        error={state.errors?.spouse_hebrew_name}
      />
      <label className="flex items-center gap-3">
        <input type="checkbox" name="has_children" defaultChecked={defaults.has_children} className="w-4 h-4" />
        <span className="text-sm">Есть дети</span>
      </label>
      <Field
        label="Возраст детей (через запятую)" name="children_ages_csv"
        placeholder="4, 7, 11"
        defaultValue={(state.values?.children_ages_csv as string) ?? defaults.children_ages}
        error={state.errors?.children_ages_csv}
      />
      <div className="pt-4 flex items-center gap-3">
        <SubmitButton>Дальше</SubmitButton>
        <SkipButton />
      </div>
    </form>
  );
}
