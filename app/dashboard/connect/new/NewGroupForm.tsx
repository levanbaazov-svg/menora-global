'use client';

import { useActionState, useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createGroup, updateGroup } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { AITextHelper } from '@/app/_components/ai/AITextHelper';
import { type Locale } from '@/i18n/config';
import {
  GROUP_CATEGORIES, GROUP_CATEGORY_LABELS,
  GROUP_VISIBILITY,
  type GroupCategory,
} from '@/lib/groups/schema';

export function NewGroupForm({
  presetCategory,
  editId,
  initial,
}: {
  presetCategory?: GroupCategory;
  editId?: string;
  initial?: Record<string, unknown>;
}) {
  const t = useTranslations('connectPage');
  const locale = useLocale() as Locale;
  const isEdit = Boolean(editId);
  const [state, action] = useActionState(
    isEdit ? updateGroup : createGroup,
    INITIAL_STATE,
  );
  // Prefill priority: server-returned values (after a failed submit) → initial → ''.
  const v = (k: string, fallback = '') =>
    (state.values?.[k] as string | undefined)
    ?? (initial?.[k] != null ? String(initial[k]) : undefined)
    ?? fallback;

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const initialTags = (val: unknown): string =>
    Array.isArray(val) ? (val as string[]).join(', ') : (val != null ? String(val) : '');
  const [tagsRaw, setTagsRaw] = useState(
    state.values?.tags != null ? initialTags(state.values.tags) : initialTags(initial?.tags),
  );

  const tagList = tagsRaw
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      {editId && <input type="hidden" name="group_id" value={editId} />}

      <Select
        label={t('new.categoryLabel')}
        name="category"
        required
        defaultValue={v('category', presetCategory ?? 'learning')}
        error={state.errors?.category}
        options={GROUP_CATEGORIES.map((c) => [c, `${GROUP_CATEGORY_LABELS[c].emoji} ${GROUP_CATEGORY_LABELS[c][locale]}`])}
      />

      <Field
        label={t('new.nameLabel')}
        name="name"
        required
        placeholder={t('new.namePlaceholder')}
        defaultValue={v('name')}
        error={state.errors?.name}
        inputRef={nameRef}
      />

      <Textarea
        label={t('new.descriptionLabel')}
        name="description"
        rows={4}
        placeholder={t('new.descriptionPlaceholder')}
        defaultValue={v('description')}
        error={state.errors?.description}
        inputRef={descRef}
        hint={<AITextHelper targetRef={descRef} kind="group" hint={{ name: nameRef.current?.value }} />}
      />

      <Field
        label={t('new.photoLabel')}
        name="photo_url"
        type="url"
        placeholder="https://..."
        defaultValue={v('photo_url')}
        error={state.errors?.photo_url}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label={t('new.frequencyLabel')}
          name="frequency"
          placeholder={t('new.frequencyPlaceholder')}
          defaultValue={v('frequency')}
          error={state.errors?.frequency}
        />
        <Field
          label={t('new.meetingLocationLabel')}
          name="meeting_location"
          placeholder={t('new.meetingLocationPlaceholder')}
          defaultValue={v('meeting_location')}
          error={state.errors?.meeting_location}
        />
      </div>

      <Select
        label={t('new.visibilityLabel')}
        name="visibility"
        defaultValue={v('visibility', 'community')}
        error={state.errors?.visibility}
        options={GROUP_VISIBILITY.map((s) => [s, t(`visibility.${s}`)])}
      />

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t('new.tagsLabel')}
        </label>
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder={t('new.tagsPlaceholder')}
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
          {t('new.tagsHint')}
        </p>
      </div>

      <div className="pt-4">
        <SubmitButton variant="gold">
          {isEdit ? t('edit.submit') : t('new.submit')}
        </SubmitButton>
        {!isEdit && (
          <p className="text-xs text-(--color-fg-muted) mt-3">
            {t('new.submitHint')}
          </p>
        )}
      </div>
    </form>
  );
}
