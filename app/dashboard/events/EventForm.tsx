'use client';

// Shared event form for create + edit. When `eventId` is set it edits via
// updateEvent; otherwise it creates via createEvent.

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createEvent, updateEvent } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { EVENT_TYPES } from '@/lib/events/schema';

interface Defaults {
  title?: string;
  type?: string;
  description?: string;
  starts_at?: string;   // 'YYYY-MM-DDTHH:mm'
  ends_at?: string;
  location_text?: string;
  max_attendees?: string;
  visibility?: string;
}

export function EventForm({ eventId, defaults }: { eventId?: string; defaults?: Defaults }) {
  const t = useTranslations('eventsPage');
  const action = eventId ? updateEvent : createEvent;
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  const v = (k: keyof Defaults, fallback = '') =>
    (state.values?.[k] as string | undefined) ?? defaults?.[k] ?? fallback;

  // Default start: tomorrow 19:00 local (only for create)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const defaultStart = tomorrow.toISOString().slice(0, 16);

  return (
    <form action={formAction} className="space-y-5">
      {eventId && <input type="hidden" name="event_id" value={eventId} />}
      <FormError message={state.formError} />
      <Field label={t('fieldTitle')} name="title" required
             placeholder={t('titlePlaceholder')}
             defaultValue={v('title')} error={state.errors?.title} />
      <Select label={t('fieldType')} name="type"
              defaultValue={v('type', 'shabbat_dinner')}
              error={state.errors?.type}
              options={EVENT_TYPES.map((et) => [et, t.has(`type.${et}`) ? t(`type.${et}`) : et])} />
      <Textarea label={t('fieldDescription')} name="description" rows={4}
                defaultValue={v('description')}
                placeholder={t('descriptionPlaceholder')}
                error={state.errors?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('fieldStart')} name="starts_at" type="datetime-local" required
               defaultValue={v('starts_at', eventId ? '' : defaultStart)} error={state.errors?.starts_at} />
        <Field label={t('fieldEnd')} name="ends_at" type="datetime-local"
               defaultValue={v('ends_at')} error={state.errors?.ends_at} />
      </div>
      <Field label={t('fieldLocation')} name="location_text" required
             placeholder={t('locationPlaceholder')}
             defaultValue={v('location_text')} error={state.errors?.location_text} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('fieldMaxAttendees')} name="max_attendees" type="number"
               defaultValue={v('max_attendees')} error={state.errors?.max_attendees} />
        <Select label={t('fieldVisibility')} name="visibility"
                defaultValue={v('visibility', 'community')}
                error={state.errors?.visibility}
                options={[['community', t('visibilityCommunity')],['public_in_app', t('visibilityPublic')]]} />
      </div>
      {!eventId && <input type="hidden" name="status" value="published" />}
      <SubmitButton variant="gold">{eventId ? t('save') : t('createEvent')}</SubmitButton>
    </form>
  );
}
