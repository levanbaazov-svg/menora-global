'use client';

import { useActionState, useState, useRef } from 'react';
import { submitPlace } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Field, Select, Textarea, FormError, SubmitButton } from '@/app/onboarding/_FormPrimitives';
import { AITextHelper } from '@/app/_components/ai/AITextHelper';
import {
  PLACE_TYPES, PLACE_TYPE_LABELS, KASHRUT_LEVELS, KASHRUT_LABELS,
  PRICE_LEVELS, CUISINE_TAGS, CUISINE_LABELS, DIETARY_TAGS, DIETARY_LABELS,
  type PlaceType,
} from '@/lib/places/schema';

export function NewPlaceForm({ defaultType, isStaff }: { defaultType?: PlaceType; isStaff: boolean }) {
  const [state, action] = useActionState(submitPlace, INITIAL_STATE);
  const [type, setType] = useState<PlaceType>(
    (defaultType ?? (state.values?.type as PlaceType | undefined) ?? 'restaurant'),
  );
  const v = (k: string, d = '') => (state.values?.[k] as string | undefined) ?? d;
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const isFood = ['restaurant', 'cafe', 'store'].includes(type);
  const isSynagogue = type === 'synagogue';

  const aiKind =
    type === 'synagogue' ? 'place_synagogue' as const :
    type === 'restaurant' ? 'place_restaurant' as const :
    type === 'cafe' ? 'place_cafe' as const :
    type === 'store' ? 'place_store' as const :
    'place_generic' as const;

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.formError} />

      {/* Type picker */}
      <fieldset>
        <legend className="text-sm font-medium mb-3">Тип места</legend>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {PLACE_TYPES.map((t) => {
            const meta = PLACE_TYPE_LABELS[t];
            return (
              <label
                key={t}
                className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                  type === t ? 'border-(--color-gold) bg-(--color-gold-soft)/50' : 'hover:border-(--color-gold)'
                }`}
              >
                <input
                  type="radio" name="type" value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                <div className="text-2xl mb-1">{meta.emoji}</div>
                <div className="text-xs font-medium">{meta.ru}</div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Название" name="name" required defaultValue={v('name')} error={state.errors?.name} inputRef={nameRef} />
      <Textarea
        label="Описание" name="description" rows={3}
        defaultValue={v('description')}
        placeholder="Что важно знать посетителю..."
        error={state.errors?.description}
        inputRef={descRef}
        hint={<AITextHelper targetRef={descRef} kind={aiKind} hint={{ name: nameRef.current?.value }} />}
      />
      <Field
        label="Фото URL" name="photo_url" type="url"
        placeholder="https://..."
        defaultValue={v('photo_url')} error={state.errors?.photo_url}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Адрес *" name="address" required defaultValue={v('address')} error={state.errors?.address} />
        <Field label="Город *" name="city" required defaultValue={v('city')} error={state.errors?.city} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Страна (ISO)" name="country_code" placeholder="IL" defaultValue={v('country_code')} error={state.errors?.country_code} />
        <Field label="Район (опц.)" name="neighborhood" defaultValue={v('neighborhood')} error={state.errors?.neighborhood} />
      </div>

      {/* Food-specific */}
      {isFood && (
        <fieldset className="border rounded-xl p-4 space-y-4">
          <legend className="text-sm font-medium px-2">Кашрут и кухня</legend>
          <Select
            label="Уровень кашрута" name="kashrut_level"
            defaultValue={v('kashrut_level', 'standard')}
            error={state.errors?.kashrut_level}
            options={KASHRUT_LEVELS.map((k) => [k, KASHRUT_LABELS[k].label])}
          />
          <Field label="Сертификат (OU, Star-K, и т.д.)" name="kashrut_authority"
                 defaultValue={v('kashrut_authority')} error={state.errors?.kashrut_authority} />
          <Select
            label="Ценовой уровень" name="price_level"
            defaultValue={v('price_level', '$$')}
            error={state.errors?.price_level}
            options={PRICE_LEVELS.map((p) => [p, `${p} ${{ $: 'недорого', $$: 'средне', $$$: 'дорого', $$$$: 'премиум' }[p]}`])}
          />
          <Chips
            label="Кухня" name="cuisine_tags"
            options={[...CUISINE_TAGS]} labels={CUISINE_LABELS}
            defaults={(state.values?.cuisine_tags as string[]) ?? []}
          />
          <Chips
            label="Диета / тип" name="dietary_tags"
            options={[...DIETARY_TAGS]} labels={DIETARY_LABELS}
            defaults={(state.values?.dietary_tags as string[]) ?? []}
          />
        </fieldset>
      )}

      {/* Synagogue-specific */}
      {isSynagogue && (
        <fieldset className="border rounded-xl p-4 space-y-3">
          <legend className="text-sm font-medium px-2">Особенности синагоги</legend>
          <Check name="has_women_section" label="Есть женская секция" defaultChecked={v('has_women_section') === 'true'} />
          <Check name="has_parking_shabbat" label="Парковка в шаббат" defaultChecked={v('has_parking_shabbat') === 'true'} />
          <Field label="Расписание молитв URL" name="prayer_times_url" type="url" defaultValue={v('prayer_times_url')} />
        </fieldset>
      )}

      <fieldset className="border rounded-xl p-4 space-y-4">
        <legend className="text-sm font-medium px-2">Контакты</legend>
        <Field label="Телефон" name="contact_phone" placeholder="+972..." defaultValue={v('contact_phone')} />
        <Field label="Email" name="contact_email" type="email" defaultValue={v('contact_email')} />
        <Field label="Сайт" name="website_url" type="url" defaultValue={v('website_url')} />
        <Field label="Reservation URL (опц.)" name="reservation_url" type="url" defaultValue={v('reservation_url')} />
      </fieldset>

      <Textarea
        label="Часы / заметка" name="hours_notes" rows={2}
        defaultValue={v('hours_notes')}
        placeholder="Пн-Чт 9-23 · Пт 9-15 · Шаб закрыто · Вс 10-23"
      />

      <div className="space-y-2">
        <Check name="accepts_reservations" label="Принимают бронирования" defaultChecked={v('accepts_reservations') === 'true'} />
        <Check name="wheelchair_accessible" label="Доступно для колясочников" defaultChecked={v('wheelchair_accessible') === 'true'} />
        <Check name="family_friendly" label="С детьми" defaultChecked={v('family_friendly') === 'true'} />
      </div>

      <div className="pt-4">
        <SubmitButton variant="gold">
          {isStaff ? 'Опубликовать' : 'Подать на модерацию'}
        </SubmitButton>
        {!isStaff && (
          <p className="text-xs text-(--color-fg-muted) mt-2">
            Раввин получит уведомление и одобрит место — обычно в течение дня.
          </p>
        )}
      </div>
    </form>
  );
}

function Chips({ label, name, options, labels, defaults }: {
  label: string; name: string; options: string[];
  labels: Record<string, string>; defaults: string[];
}) {
  const set = new Set(defaults);
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((key) => (
          <label key={key} className="cursor-pointer">
            <input
              type="checkbox" name={name} value={key}
              defaultChecked={set.has(key)}
              className="peer hidden"
            />
            <span className="px-3 py-1.5 rounded-full border text-xs peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) inline-block">
              {labels[key]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
