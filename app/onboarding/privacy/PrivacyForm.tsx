'use client';

import { useActionState } from 'react';
import { submitPrivacy } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { RadioGroup, Check, FormError, SubmitButton } from '../_FormPrimitives';

interface Props {
  defaults: {
    profile_visibility: string;
    channels: { email: boolean; push: boolean };
    categories: { events: boolean; requests: boolean; prayers: boolean; community: boolean };
  };
  mode?: 'onboarding' | 'edit';
}

export function PrivacyForm({ defaults, mode = 'onboarding' }: Props) {
  const [state, action] = useActionState(submitPrivacy, INITIAL_STATE);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <RadioGroup
        label="Кто видит мой профиль *" name="profile_visibility" columns={1}
        defaultValue={(state.values?.profile_visibility as string) ?? defaults.profile_visibility}
        error={state.errors?.profile_visibility}
        options={[
          ['community', 'Все члены моей общины'],
          ['members_only', 'Только подтверждённые члены'],
          ['private', 'Никто (только я и раввин)'],
        ]}
      />
      <fieldset>
        <legend className="text-sm font-medium mb-2">Каналы уведомлений</legend>
        <div className="space-y-2">
          <Check name="notify_email" label="Email" defaultChecked={defaults.channels.email} />
          <Check name="notify_push" label="Push (в браузере)" defaultChecked={defaults.channels.push} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium mb-2">О чём уведомлять</legend>
        <div className="space-y-2">
          <Check name="notify_events"    label="Новые события" defaultChecked={defaults.categories.events} />
          <Check name="notify_requests"  label="Просьбы в общине" defaultChecked={defaults.categories.requests} />
          <Check name="notify_prayers"   label="Напоминания о молитвах" defaultChecked={defaults.categories.prayers} />
          <Check name="notify_community" label="Новости общины" defaultChecked={defaults.categories.community} />
        </div>
      </fieldset>
      <div className="pt-4">
        <SubmitButton variant="gold">Завершить</SubmitButton>
      </div>
    </form>
  );
}
