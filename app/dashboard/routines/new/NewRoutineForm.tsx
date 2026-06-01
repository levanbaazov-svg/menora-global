'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createRoutine } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { ROUTINE_TYPES, ROUTINE_META, DAYS_OF_WEEK, type RoutineType } from '@/lib/routines/schema';

export function NewRoutineForm() {
  const t = useTranslations('personal');
  const [state, action] = useActionState(createRoutine, INITIAL_STATE);
  const initialType = (state.values?.type as RoutineType | undefined) ?? 'shacharit';
  const [type, setType] = useState<RoutineType>(initialType);

  const meta = ROUTINE_META[type];
  const defaultTime = (state.values?.target_time as string | undefined)?.slice(0, 5) ?? meta.defaultTime;
  const selectedDays = new Set(
    Array.isArray(state.values?.days_of_week)
      ? (state.values?.days_of_week as string[]).map((s) => parseInt(s, 10))
      : [],
  );

  return (
    <form action={action} className="space-y-6">
      <FormError message={state.formError} />

      {/* Type picker as grid of cards */}
      <fieldset>
        <legend className="text-sm font-medium mb-3">{t('routines.new.trackWhat')}</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ROUTINE_TYPES.map((rt) => {
            const m = ROUTINE_META[rt];
            return (
              <label
                key={rt}
                className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                  type === rt ? 'border-(--color-gold) bg-(--color-gold-soft)' : 'hover:border-(--color-gold)'
                }`}
              >
                <input
                  type="radio" name="type" value={rt}
                  checked={type === rt}
                  onChange={() => setType(rt)}
                  className="sr-only"
                />
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-sm font-medium">{t(`routines.types.${rt}`)}</div>
              </label>
            );
          })}
        </div>
        {state.errors?.type && <p className="text-xs text-red-600 mt-2">{state.errors.type}</p>}
      </fieldset>

      <p className="text-sm text-(--color-fg-muted) -mt-2">{t(`routines.descriptions.${type}`)}</p>

      {type === 'custom' && (
        <Field
          label={t('routines.new.customLabel')} name="custom_label"
          placeholder={t('routines.new.customPlaceholder')}
          defaultValue={(state.values?.custom_label as string) ?? ''}
          error={state.errors?.custom_label}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t('routines.new.time')} name="target_time" type="time" required
          defaultValue={defaultTime} error={state.errors?.target_time}
        />
        <Field
          label={t('routines.new.reminderOffset')} name="reminder_offset_minutes" type="number"
          defaultValue={(state.values?.reminder_offset_minutes as string) ?? '10'}
          error={state.errors?.reminder_offset_minutes}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">{t('routines.new.daysOfWeek')}</legend>
        <p className="text-xs text-(--color-fg-muted) mb-2">{t('routines.new.daysHint')}</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => (
            <label key={d.value} className="cursor-pointer">
              <input
                type="checkbox" name="days_of_week" value={String(d.value)}
                defaultChecked={selectedDays.has(d.value)}
                className="peer hidden"
              />
              <span className="px-4 py-2 rounded-full border text-sm peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) inline-block">
                {t(`routines.days.${d.value}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="pt-4">
        <SubmitButton variant="gold">{t('routines.new.submit')}</SubmitButton>
      </div>
    </form>
  );
}
