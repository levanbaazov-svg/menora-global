'use client';

import { useActionState, useState } from 'react';
import { createRoutine } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { ROUTINE_TYPES, ROUTINE_META, DAYS_OF_WEEK, type RoutineType } from '@/lib/routines/schema';

export function NewRoutineForm() {
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
        <legend className="text-sm font-medium mb-3">Что трекаем</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ROUTINE_TYPES.map((t) => {
            const m = ROUTINE_META[t];
            return (
              <label
                key={t}
                className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                  type === t ? 'border-(--color-gold) bg-(--color-gold-soft)' : 'hover:border-(--color-gold)'
                }`}
              >
                <input
                  type="radio" name="type" value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-sm font-medium">{m.label}</div>
              </label>
            );
          })}
        </div>
        {state.errors?.type && <p className="text-xs text-red-600 mt-2">{state.errors.type}</p>}
      </fieldset>

      <p className="text-sm text-(--color-fg-muted) -mt-2">{meta.description}</p>

      {type === 'custom' && (
        <Field
          label="Название *" name="custom_label"
          placeholder="Например: Изучение Тании по 15 минут"
          defaultValue={(state.values?.custom_label as string) ?? ''}
          error={state.errors?.custom_label}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Время" name="target_time" type="time" required
          defaultValue={defaultTime} error={state.errors?.target_time}
        />
        <Field
          label="Напомнить за (мин)" name="reminder_offset_minutes" type="number"
          defaultValue={(state.values?.reminder_offset_minutes as string) ?? '10'}
          error={state.errors?.reminder_offset_minutes}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Дни недели</legend>
        <p className="text-xs text-(--color-fg-muted) mb-2">Ничего не выбрано или все 7 = каждый день</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => (
            <label key={d.value} className="cursor-pointer">
              <input
                type="checkbox" name="days_of_week" value={String(d.value)}
                defaultChecked={selectedDays.has(d.value)}
                className="peer hidden"
              />
              <span className="px-4 py-2 rounded-full border text-sm peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) inline-block">
                {d.short}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="pt-4">
        <SubmitButton variant="gold">Добавить рутину</SubmitButton>
      </div>
    </form>
  );
}
