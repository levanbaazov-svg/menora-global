import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

export const EVENT_TYPES = [
  'shabbat_dinner','shabbat_lunch','holiday_meal','lecture',
  'minyan','learning','social','volunteer','kids','other',
] as const;

export const EVENT_TYPE_LABELS: Record<typeof EVENT_TYPES[number], string> = {
  shabbat_dinner: 'Шаббатний ужин',
  shabbat_lunch:  'Шаббатний обед',
  holiday_meal:   'Праздничная трапеза',
  lecture:        'Лекция / шиур',
  minyan:         'Миньян',
  learning:       'Учёба',
  social:         'Социальное',
  volunteer:      'Волонтёрство',
  kids:           'Для детей',
  other:          'Другое',
};

export const createEventSchema = z.object({
  title:         trimmed.pipe(z.string().min(2, 'Название обязательно').max(200)),
  description:   z.string().max(5000).optional().transform((v) => v?.trim() || undefined),
  type:          z.enum(EVENT_TYPES),
  starts_at:     z.string().min(1, 'Укажи дату и время начала'),
  ends_at:       z.string().optional().transform((v) => v?.trim() || undefined),
  location_text: trimmed.pipe(z.string().min(1, 'Укажи место').max(300)),
  visibility:    z.enum(['community','members_invited','public_in_app']).default('community'),
  max_attendees: z.string().optional().transform((v) => {
    if (!v) return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }),
  status:        z.enum(['draft','published']).default('published'),
}).refine(
  (d) => !d.ends_at || new Date(d.ends_at) >= new Date(d.starts_at),
  { message: 'Конец должен быть позже начала', path: ['ends_at'] },
);

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const rsvpSchema = z.object({
  event_id: z.string().uuid(),
  status:   z.enum(['yes','maybe','no']),
});
