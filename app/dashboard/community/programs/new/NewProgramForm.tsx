'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createProgram, updateProgram } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { PROGRAM_CATEGORIES, type ProgramCategory } from '@/lib/places/schema';

const PERIODS = ['one_time', 'monthly', 'yearly', 'per_session'] as const;

export function NewProgramForm({
  presetCategory,
  editId,
  initial,
}: {
  presetCategory?: ProgramCategory;
  editId?: string;
  initial?: Record<string, unknown>;
}) {
  const t = useTranslations('communityPages');
  const [state, action] = useActionState(editId ? updateProgram : createProgram, INITIAL_STATE);
  const v = (k: string, fallback = '') =>
    (state.values?.[k] as string | undefined) ?? (initial?.[k] != null ? String(initial[k]) : fallback);
  const checked = (k: string, def: boolean) =>
    state.values?.[k] != null ? state.values[k] === 'true' : (initial?.[k] as boolean | undefined) ?? def;

  return (
    <form action={action} className="space-y-5">
      {editId && <input type="hidden" name="program_id" value={editId} />}
      <FormError message={state.formError} />

      <Select
        label={t('newProgram.categoryLabel')}
        name="category"
        required
        defaultValue={v('category', presetCategory ?? 'kids')}
        error={state.errors?.category}
        options={PROGRAM_CATEGORIES.map((c) => [c, t(`programCategories.${c}`)])}
      />

      <Field
        label={t('newProgram.nameLabel')}
        name="name"
        required
        placeholder={t('newProgram.namePlaceholder')}
        defaultValue={v('name')}
        error={state.errors?.name}
      />

      <Textarea
        label={t('newProgram.descriptionLabel')}
        name="description"
        rows={4}
        placeholder={t('newProgram.descriptionPlaceholder')}
        defaultValue={v('description')}
        error={state.errors?.description}
      />

      <Field
        label={t('newProgram.scheduleLabel')}
        name="schedule_text"
        required
        placeholder={t('newProgram.schedulePlaceholder')}
        defaultValue={v('schedule_text')}
        error={state.errors?.schedule_text}
      />

      <Field
        label={t('newProgram.photoLabel')}
        name="photo_url"
        type="url"
        placeholder="https://..."
        defaultValue={v('photo_url')}
        error={state.errors?.photo_url}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('newProgram.ageMinLabel')} name="age_min" type="number" defaultValue={v('age_min')} error={state.errors?.age_min} />
        <Field label={t('newProgram.ageMaxLabel')} name="age_max" type="number" defaultValue={v('age_max')} error={state.errors?.age_max} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label={t('newProgram.priceLabel')} name="price_amount" type="number" defaultValue={v('price_amount')} error={state.errors?.price_amount} />
        <Field label={t('newProgram.currencyLabel')} name="price_currency" placeholder="USD" defaultValue={v('price_currency')} error={state.errors?.price_currency} />
        <Select
          label={t('newProgram.periodLabel')}
          name="price_period"
          defaultValue={v('price_period', 'monthly')}
          error={state.errors?.price_period}
          options={PERIODS.map((p) => [p, t(`newProgram.period.${p}`)])}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('newProgram.capacityLabel')} name="max_capacity" type="number" defaultValue={v('max_capacity')} error={state.errors?.max_capacity} />
        <Field label={t('newProgram.locationLabel')} name="location_text" defaultValue={v('location_text')} error={state.errors?.location_text} />
      </div>

      <Field
        label={t('newProgram.registrationUrlLabel')}
        name="registration_url"
        type="url"
        placeholder="https://..."
        defaultValue={v('registration_url')}
        error={state.errors?.registration_url}
      />

      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="registration_open" value="true" defaultChecked={checked('registration_open', true)} className="size-4 accent-(--color-gold)" />
          {t('newProgram.registrationOpenLabel')}
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="requires_approval" value="true" defaultChecked={checked('requires_approval', false)} className="size-4 accent-(--color-gold)" />
          {t('newProgram.requiresApprovalLabel')}
        </label>
      </div>

      <div className="pt-4">
        <SubmitButton variant="gold">{editId ? t('newProgram.save') : t('newProgram.submit')}</SubmitButton>
        {!editId && <p className="text-xs text-(--color-fg-muted) mt-3">{t('newProgram.submitHint')}</p>}
      </div>
    </form>
  );
}
