'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('onboarding');
  const [state, action] = useActionState(submitPrivacy, INITIAL_STATE);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="from" value={mode} />
      <FormError message={state.formError} />
      <RadioGroup
        label={t('privacy.visibility')} name="profile_visibility" columns={1}
        defaultValue={(state.values?.profile_visibility as string) ?? defaults.profile_visibility}
        error={state.errors?.profile_visibility}
        options={[
          ['community', t('privacy.visibilityCommunity')],
          ['members_only', t('privacy.visibilityMembersOnly')],
          ['private', t('privacy.visibilityPrivate')],
        ]}
      />
      <fieldset>
        <legend className="text-sm font-medium mb-2">{t('privacy.channels')}</legend>
        <div className="space-y-2">
          <Check name="notify_email" label={t('privacy.channelEmail')} defaultChecked={defaults.channels.email} />
          <Check name="notify_push" label={t('privacy.channelPush')} defaultChecked={defaults.channels.push} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium mb-2">{t('privacy.categories')}</legend>
        <div className="space-y-2">
          <Check name="notify_events"    label={t('privacy.catEvents')} defaultChecked={defaults.categories.events} />
          <Check name="notify_requests"  label={t('privacy.catRequests')} defaultChecked={defaults.categories.requests} />
          <Check name="notify_prayers"   label={t('privacy.catPrayers')} defaultChecked={defaults.categories.prayers} />
          <Check name="notify_community" label={t('privacy.catCommunity')} defaultChecked={defaults.categories.community} />
        </div>
      </fieldset>
      <div className="pt-4">
        <SubmitButton variant="gold">{t('privacy.finish')}</SubmitButton>
      </div>
    </form>
  );
}
