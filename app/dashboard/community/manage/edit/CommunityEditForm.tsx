'use client';

import { useActionState } from 'react';
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
  const [state, action] = useActionState(updateCommunity, INITIAL_STATE);
  const v = (k: keyof Defaults) =>
    (state.values?.[k] as string | undefined) ?? defaults[k] ?? '';

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      <Field label="Название общины" name="name" required
             defaultValue={v('name')} error={state.errors?.name} />
      <Textarea label="Описание" name="description" rows={5}
                placeholder="Расскажите об общине — история, атмосфера, для кого…"
                defaultValue={v('description')} error={state.errors?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Течение" name="denomination" placeholder="Chabad, Modern Orthodox…"
               defaultValue={v('denomination')} error={state.errors?.denomination} />
        <Field label="Год основания" name="founded_year" type="number" placeholder="1991"
               defaultValue={v('founded_year')} error={state.errors?.founded_year} />
      </div>
      <Field label="Фото-обложка (URL)" name="hero_image_url" type="url" placeholder="https://…"
             defaultValue={v('hero_image_url')} error={state.errors?.hero_image_url} />
      <Field label="Адрес" name="address" placeholder="ул. …, город"
             defaultValue={v('address')} error={state.errors?.address} />

      <div className="pt-2 text-xs uppercase tracking-wide text-(--color-fg-muted) font-medium">Контакты</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Телефон" name="contact_phone" defaultValue={v('contact_phone')} error={state.errors?.contact_phone} />
        <Field label="Email" name="contact_email" type="email" defaultValue={v('contact_email')} error={state.errors?.contact_email} />
      </div>
      <Field label="Сайт" name="website_url" type="url" placeholder="https://…"
             defaultValue={v('website_url')} error={state.errors?.website_url} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="WhatsApp (ссылка)" name="whatsapp_url" type="url" placeholder="https://wa.me/…"
               defaultValue={v('whatsapp_url')} error={state.errors?.whatsapp_url} />
        <Field label="Instagram (ссылка)" name="instagram_url" type="url" placeholder="https://instagram.com/…"
               defaultValue={v('instagram_url')} error={state.errors?.instagram_url} />
      </div>

      <SubmitButton variant="gold">Сохранить</SubmitButton>
    </form>
  );
}
