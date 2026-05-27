'use client';

import { useActionState, useState } from 'react';
import { createGroup } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import {
  GROUP_CATEGORIES, GROUP_CATEGORY_LABELS,
  GROUP_VISIBILITY, VISIBILITY_LABELS,
  type GroupCategory,
} from '@/lib/groups/schema';

export function NewGroupForm({ presetCategory }: { presetCategory?: GroupCategory }) {
  const [state, action] = useActionState(createGroup, INITIAL_STATE);
  const v = (k: string, fallback = '') =>
    (state.values?.[k] as string | undefined) ?? fallback;

  const [tagsRaw, setTagsRaw] = useState(
    Array.isArray(state.values?.tags) ? (state.values.tags as string[]).join(', ') : v('tags'),
  );

  const tagList = tagsRaw
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      <Select
        label="Категория"
        name="category"
        required
        defaultValue={v('category', presetCategory ?? 'learning')}
        error={state.errors?.category}
        options={GROUP_CATEGORIES.map((c) => [c, `${GROUP_CATEGORY_LABELS[c].emoji} ${GROUP_CATEGORY_LABELS[c].ru}`])}
      />

      <Field
        label="Название"
        name="name"
        required
        placeholder="Например: Утренний parsha-кружок"
        defaultValue={v('name')}
        error={state.errors?.name}
      />

      <Textarea
        label="Описание (опц.)"
        name="description"
        rows={4}
        placeholder="О чём встречаемся, для кого, чего ожидать на первой встрече..."
        defaultValue={v('description')}
        error={state.errors?.description}
      />

      <Field
        label="Фото — URL (опц.)"
        name="photo_url"
        type="url"
        placeholder="https://..."
        defaultValue={v('photo_url')}
        error={state.errors?.photo_url}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Частота (опц.)"
          name="frequency"
          placeholder="Раз в неделю, по четвергам 20:00"
          defaultValue={v('frequency')}
          error={state.errors?.frequency}
        />
        <Field
          label="Место встречи (опц.)"
          name="meeting_location"
          placeholder="У синагоги, кафе Friman, у Реувена"
          defaultValue={v('meeting_location')}
          error={state.errors?.meeting_location}
        />
      </div>

      <Select
        label="Кто видит группу"
        name="visibility"
        defaultValue={v('visibility', 'community')}
        error={state.errors?.visibility}
        options={GROUP_VISIBILITY.map((s) => [s, VISIBILITY_LABELS[s].ru])}
      />

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Теги (опц.)
        </label>
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="иврит, утро, для женщин (через запятую)"
          className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-(--color-gold)"
        />
        {/* hidden inputs so action receives `tags` as multi-value */}
        {tagList.map((t) => (
          <input key={t} type="hidden" name="tags" value={t} />
        ))}
        {tagList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagList.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full border border-(--color-border) text-(--color-fg-muted)"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-(--color-fg-muted) mt-1.5">
          До 12 тегов. Помогают людям найти группу.
        </p>
      </div>

      <div className="pt-4">
        <SubmitButton variant="gold">Создать группу</SubmitButton>
        <p className="text-xs text-(--color-fg-muted) mt-3">
          Ты автоматически станешь админом группы.
        </p>
      </div>
    </form>
  );
}
