'use client';

// Shared event form for create + edit. When `eventId` is set it edits via
// updateEvent; otherwise it creates via createEvent.

import { useActionState } from 'react';
import { createEvent, updateEvent } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '@/lib/events/schema';

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
      <Field label="Название" name="title" required
             placeholder="Шаббатний ужин у Реувена"
             defaultValue={v('title')} error={state.errors?.title} />
      <Select label="Тип" name="type"
              defaultValue={v('type', 'shabbat_dinner')}
              error={state.errors?.type}
              options={EVENT_TYPES.map((t) => [t, EVENT_TYPE_LABELS[t]])} />
      <Textarea label="Описание" name="description" rows={4}
                defaultValue={v('description')}
                placeholder="Что будет, что взять, для кого…"
                error={state.errors?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Начало" name="starts_at" type="datetime-local" required
               defaultValue={v('starts_at', eventId ? '' : defaultStart)} error={state.errors?.starts_at} />
        <Field label="Конец" name="ends_at" type="datetime-local"
               defaultValue={v('ends_at')} error={state.errors?.ends_at} />
      </div>
      <Field label="Место" name="location_text" required
             placeholder="Адрес или название места"
             defaultValue={v('location_text')} error={state.errors?.location_text} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Максимум гостей" name="max_attendees" type="number"
               defaultValue={v('max_attendees')} error={state.errors?.max_attendees} />
        <Select label="Видимость" name="visibility"
                defaultValue={v('visibility', 'community')}
                error={state.errors?.visibility}
                options={[['community','Только община'],['public_in_app','Все в Menorah']]} />
      </div>
      {!eventId && <input type="hidden" name="status" value="published" />}
      <SubmitButton variant="gold">{eventId ? 'Сохранить' : 'Создать событие'}</SubmitButton>
    </form>
  );
}
