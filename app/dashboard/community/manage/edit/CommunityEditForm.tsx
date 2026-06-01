'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updateCommunity } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';

interface Defaults {
  name?: string;
  description?: string;
  denomination?: string;
  founded_year?: string;
  address?: string;
  hero_image_url?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  whatsapp_url?: string;
  instagram_url?: string;
}

export function CommunityEditForm({ defaults }: { defaults: Defaults }) {
  const t = useTranslations('communityPages.editForm');
  const [state, action] = useActionState(updateCommunity, INITIAL_STATE);
  const v = (k: keyof Defaults) =>
    (state.values?.[k] as string | undefined) ?? defaults[k] ?? '';

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      <Field label={t('name')} name="name" required
             defaultValue={v('name')} error={state.errors?.name} />
      <Textarea label={t('description')} name="description" rows={5}
                placeholder={t('descriptionPlaceholder')}
                defaultValue={v('description')} error={state.errors?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('denomination')} name="denomination" placeholder="Chabad, Modern Orthodox…"
               defaultValue={v('denomination')} error={state.errors?.denomination} />
        <Field label={t('foundedYear')} name="founded_year" type="number" placeholder="1991"
               defaultValue={v('founded_year')} error={state.errors?.founded_year} />
      </div>
      <Field label={t('heroImage')} name="hero_image_url" type="url" placeholder="https://…"
             defaultValue={v('hero_image_url')} error={state.errors?.hero_image_url} />
      <Field label={t('address')} name="address" placeholder={t('addressPlaceholder')}
             defaultValue={v('address')} error={state.errors?.address} />

      <div className="pt-2 text-xs uppercase tracking-wide text-(--color-fg-muted) font-medium">{t('contacts')}</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('phone')} name="contact_phone" defaultValue={v('contact_phone')} error={state.errors?.contact_phone} />
        <Field label={t('email')} name="contact_email" type="email" defaultValue={v('contact_email')} error={state.errors?.contact_email} />
      </div>
      <Field label={t('website')} name="website_url" type="url" placeholder="https://…"
             defaultValue={v('website_url')} error={state.errors?.website_url} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('whatsapp')} name="whatsapp_url" type="url" placeholder="https://wa.me/…"
               defaultValue={v('whatsapp_url')} error={state.errors?.whatsapp_url} />
        <Field label={t('instagram')} name="instagram_url" type="url" placeholder="https://instagram.com/…"
               defaultValue={v('instagram_url')} error={state.errors?.instagram_url} />
      </div>

      <SubmitButton variant="gold">{t('save')}</SubmitButton>
    </form>
  );
}
