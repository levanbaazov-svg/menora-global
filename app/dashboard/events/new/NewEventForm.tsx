'use client';

import { useActionState, useRef } from 'react';
import { createEvent } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '@/lib/events/schema';
import { AITextHelper } from '@/app/_components/ai/AITextHelper';
import { AICoverGenerator } from '@/app/_components/ai/AICoverGenerator';

export function NewEventForm({ communityCity }: { communityCity?: string }) {
  const [state, action] = useActionState(createEvent, INITIAL_STATE);
  const v = (k: string, fallback = '') =>
    (state.values?.[k] as string | undefined) ?? fallback;

  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Default start: tomorrow 19:00 local
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const defaultStart = tomorrow.toISOString().slice(0, 16);

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />
      <Field
        label="Название" name="title" required
        placeholder="Шаббатний ужин у Реувена"
        defaultValue={v('title')} error={state.errors?.title}
        inputRef={titleRef}
      />
      <Select
        label="Тип" name="type"
        defaultValue={v('type', 'shabbat_dinner')}
        error={state.errors?.type}
        options={EVENT_TYPES.map((t) => [t, EVENT_TYPE_LABELS[t]])}
        inputRef={typeRef}
      />
      <Textarea
        label="Описание" name="description" rows={4}
        defaultValue={v('description')}
        placeholder="Меню, программа, дресс-код, что взять с собой..."
        error={state.errors?.description}
        inputRef={descRef}
        hint={
          <AITextHelper
            targetRef={descRef}
            kind="event"
            hint={{ communityName: communityCity }}
          />
        }
      />

      {/* AI Cover image generator */}
      <div>
        <span className="text-sm font-semibold text-(--color-fg) block mb-2">
          Обложка события
        </span>
        <AICoverGenerator
          titleRef={titleRef}
          typeRef={typeRef}
          descriptionRef={descRef}
          communityCity={communityCity}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Начало" name="starts_at" type="datetime-local" required
               defaultValue={v('starts_at', defaultStart)} error={state.errors?.starts_at} />
        <Field label="Конец (опц.)" name="ends_at" type="datetime-local"
               defaultValue={v('ends_at')} error={state.errors?.ends_at} />
      </div>
      <Field label="Место" name="location_text" required
             placeholder="У Реувена дома, ул. Бен-Йехуда 5"
             defaultValue={v('location_text')} error={state.errors?.location_text} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Макс. участников (опц.)" name="max_attendees" type="number"
               placeholder="8" defaultValue={v('max_attendees')}
               error={state.errors?.max_attendees} />
        <Select label="Видимость" name="visibility"
                defaultValue={v('visibility', 'community')}
                error={state.errors?.visibility}
                options={[
                  ['community', 'Только в моей общине'],
                  ['public_in_app', 'Видно всем в Menorah'],
                ]} />
      </div>
      <fieldset className="border rounded-lg p-4 space-y-2">
        <legend className="text-sm font-medium px-2">Статус</legend>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="radio" name="status" value="published" defaultChecked={v('status') !== 'draft'} className="w-4 h-4" />
          <span className="text-sm">Опубликовать сразу</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="radio" name="status" value="draft" defaultChecked={v('status') === 'draft'} className="w-4 h-4" />
          <span className="text-sm">Сохранить как черновик</span>
        </label>
      </fieldset>
      <div className="pt-4">
        <SubmitButton variant="gold">Создать</SubmitButton>
      </div>
    </form>
  );
}
