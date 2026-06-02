// Labels, enums, Zod schemas for places + programs.

import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

// Empty form fields submit as '' — map to undefined so optional numeric/format
// validators (min/length/enum) don't reject a blank optional field.
const emptyToUndef = (v: unknown) => (v === '' || v == null ? undefined : v);

// ── Place types ──────────────────────────────────────────────────────────────
export const PLACE_TYPES = [
  'synagogue', 'restaurant', 'cafe', 'store',
  'mikvah', 'school', 'service', 'jcc', 'museum', 'cemetery',
] as const;
export type PlaceType = typeof PLACE_TYPES[number];

export const PLACE_TYPE_LABELS: Record<PlaceType, { ru: string; en: string; he: string; emoji: string }> = {
  synagogue:  { ru: 'Синагоги',     en: 'Synagogues',  he: 'בתי כנסת',   emoji: '🕍' },
  restaurant: { ru: 'Рестораны',    en: 'Restaurants', he: 'מסעדות',     emoji: '🍽' },
  cafe:       { ru: 'Кафе',         en: 'Cafés',       he: 'בתי קפה',    emoji: '☕' },
  store:      { ru: 'Магазины',     en: 'Stores',      he: 'חנויות',     emoji: '🛒' },
  mikvah:     { ru: 'Микве',        en: 'Mikvahs',     he: 'מקוואות',    emoji: '🛁' },
  school:     { ru: 'Школы',        en: 'Schools',     he: 'בתי ספר',    emoji: '🎓' },
  service:    { ru: 'Сервисы',      en: 'Services',    he: 'שירותים',    emoji: '🛠' },
  jcc:        { ru: 'JCC',          en: 'JCC',         he: 'JCC',        emoji: '🏛' },
  museum:     { ru: 'Музеи',        en: 'Museums',     he: 'מוזיאונים',  emoji: '🖼' },
  cemetery:   { ru: 'Кладбища',     en: 'Cemeteries',  he: 'בתי עלמין',  emoji: '🕯' },
};

// ── Kashrut levels ───────────────────────────────────────────────────────────
export const KASHRUT_LEVELS = ['none', 'basic', 'standard', 'mehadrin', 'glatt'] as const;
export type KashrutLevel = typeof KASHRUT_LEVELS[number];

export const KASHRUT_LABELS: Record<KashrutLevel, { label: string; color: string }> = {
  none:     { label: 'Не кошер',  color: 'bg-gray-100 text-gray-700' },
  basic:    { label: 'Самопровозглашён', color: 'bg-orange-100 text-orange-800' },
  standard: { label: 'Кошер',     color: 'bg-green-100 text-green-800' },
  mehadrin: { label: 'Мехадрин',  color: 'bg-blue-100 text-blue-800' },
  glatt:    { label: 'Гладт',     color: 'bg-purple-100 text-purple-800' },
};

// ── Price level ──────────────────────────────────────────────────────────────
export const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'] as const;
export type PriceLevel = typeof PRICE_LEVELS[number];

// ── Cuisine tags ─────────────────────────────────────────────────────────────
export const CUISINE_TAGS = [
  'israeli', 'ashkenazi', 'sephardi', 'mediterranean',
  'european', 'asian', 'american', 'middle_eastern', 'fusion',
] as const;
export const CUISINE_LABELS: Record<string, string> = {
  israeli:        'Израильская',
  ashkenazi:      'Ашкеназская',
  sephardi:       'Сефардская',
  mediterranean:  'Средиземноморская',
  european:       'Европейская',
  asian:          'Азиатская',
  american:       'Американская',
  middle_eastern: 'Ближневосточная',
  fusion:         'Фьюжн',
};

export const DIETARY_TAGS = [
  'meat', 'dairy', 'pareve', 'vegan', 'vegetarian', 'gluten_free',
] as const;
export const DIETARY_LABELS: Record<string, string> = {
  meat:        '🥩 Мясная',
  dairy:       '🧀 Молочная',
  pareve:      'Парве',
  vegan:       'Веган',
  vegetarian:  'Вегетарианская',
  gluten_free: 'Без глютена',
};

// ── Zod schemas ──────────────────────────────────────────────────────────────
export const createPlaceSchema = z.object({
  type:           z.enum(PLACE_TYPES),
  name:           trimmed.pipe(z.string().min(2, 'Название обязательно').max(200)),
  description:    z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
  photo_url:      z.string().url('Нужна ссылка на фото').optional().or(z.literal('').transform(() => undefined)),
  address:        trimmed.pipe(z.string().min(3, 'Укажи адрес').max(300)),
  city:           trimmed.pipe(z.string().min(2).max(100)),
  country_code:   z.string().length(2, 'ISO-код страны: 2 буквы').toUpperCase().optional().or(z.literal('').transform(() => undefined)),
  neighborhood:   z.string().max(100).optional().transform((v) => v?.trim() || undefined),
  latitude:       z.coerce.number().min(-90).max(90).optional(),
  longitude:      z.coerce.number().min(-180).max(180).optional(),
  contact_phone:  z.string().max(50).optional().transform((v) => v?.trim() || undefined),
  contact_email:  z.string().email().optional().or(z.literal('').transform(() => undefined)),
  website_url:    z.string().url().optional().or(z.literal('').transform(() => undefined)),
  reservation_url:z.string().url().optional().or(z.literal('').transform(() => undefined)),
  hours_notes:    z.string().max(500).optional().transform((v) => v?.trim() || undefined),
  kashrut_level:  z.enum(KASHRUT_LEVELS).optional(),
  kashrut_authority: z.string().max(100).optional().transform((v) => v?.trim() || undefined),
  price_level:    z.enum(PRICE_LEVELS).optional(),
  cuisine_tags:   z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    const arr = !v ? [] : Array.isArray(v) ? v : [v];
    return arr.filter((s): s is typeof CUISINE_TAGS[number] => (CUISINE_TAGS as readonly string[]).includes(s));
  }),
  dietary_tags:   z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    const arr = !v ? [] : Array.isArray(v) ? v : [v];
    return arr.filter((s): s is typeof DIETARY_TAGS[number] => (DIETARY_TAGS as readonly string[]).includes(s));
  }),
  has_women_section: z.coerce.boolean().optional(),
  has_parking_shabbat: z.coerce.boolean().optional(),
  accepts_reservations: z.coerce.boolean().optional(),
  wheelchair_accessible: z.coerce.boolean().optional(),
  family_friendly: z.coerce.boolean().optional(),
  denomination:    z.string().optional(),
});
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

export const updatePlaceSchema = createPlaceSchema.extend({ place_id: z.string().uuid() });
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;

export const placeIdSchema = z.object({ place_id: z.string().uuid() });

export const approvePlaceSchema = z.object({ place_id: z.string().uuid() });
export const rejectPlaceSchema = z.object({
  place_id: z.string().uuid(),
  reason: trimmed.pipe(z.string().min(1).max(500)),
});

// ── Programs ─────────────────────────────────────────────────────────────────
export const PROGRAM_CATEGORIES = [
  'kids', 'teens', 'young_adult', 'couples',
  'families', 'newcomers', 'adults', 'seniors', 'women', 'men',
] as const;
export type ProgramCategory = typeof PROGRAM_CATEGORIES[number];

export const PROGRAM_CATEGORY_LABELS: Record<ProgramCategory, { ru: string; en: string; he: string; emoji: string }> = {
  kids:        { ru: 'Дети',              en: 'Kids',          he: 'ילדים',        emoji: '👶' },
  teens:       { ru: 'Подростки',         en: 'Teens',         he: 'נוער',         emoji: '🧒' },
  young_adult: { ru: 'Молодёжь',          en: 'Young adults',  he: 'צעירים',       emoji: '🧑‍🎓' },
  couples:     { ru: 'Пары',              en: 'Couples',       he: 'זוגות',        emoji: '💑' },
  families:    { ru: 'Семьи',             en: 'Families',      he: 'משפחות',       emoji: '👨‍👩‍👧' },
  newcomers:   { ru: 'Новички',           en: 'Newcomers',     he: 'חדשים',        emoji: '👋' },
  adults:      { ru: 'Взрослые',          en: 'Adults',        he: 'מבוגרים',      emoji: '📚' },
  seniors:     { ru: 'Старшее поколение', en: 'Seniors',       he: 'גיל הזהב',     emoji: '👴' },
  women:       { ru: 'Женские',           en: 'Women',         he: 'נשים',         emoji: '👩' },
  men:         { ru: 'Мужские',           en: 'Men',           he: 'גברים',        emoji: '👨' },
};

export const createProgramSchema = z.object({
  category:        z.enum(PROGRAM_CATEGORIES),
  name:            trimmed.pipe(z.string().min(2).max(200)),
  description:     z.string().max(5000).optional().transform((v) => v?.trim() || undefined),
  photo_url:       z.string().url().optional().or(z.literal('').transform(() => undefined)),
  schedule_text:   trimmed.pipe(z.string().min(2, 'Укажи расписание').max(300)),
  age_min:         z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(120).optional()),
  age_max:         z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(120).optional()),
  price_amount:    z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),
  price_currency:  z.preprocess(emptyToUndef, z.string().length(3).optional()),
  price_period:    z.preprocess(emptyToUndef, z.enum(['one_time','monthly','yearly','per_session']).optional()),
  max_capacity:    z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(10000).optional()),
  registration_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  registration_open: z.coerce.boolean().optional().default(true),
  requires_approval: z.coerce.boolean().optional().default(false),
  location_place_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  location_text:   z.string().max(200).optional().transform((v) => v?.trim() || undefined),
});
export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const updateProgramSchema = createProgramSchema.extend({ program_id: z.string().uuid() });
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export const programIdSchema = z.object({ program_id: z.string().uuid() });

export const enrollProgramSchema = z.object({
  program_id:      z.string().uuid(),
  is_for_child:    z.coerce.boolean().optional().default(false),
  child_first_name: z.string().max(120).optional(),
  child_last_name: z.string().max(120).optional(),
  child_dob:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:           z.string().max(1000).optional(),
}).refine(
  (d) => !d.is_for_child || (d.child_first_name && d.child_dob),
  { message: 'Для ребёнка нужно имя и дата рождения', path: ['child_first_name'] },
);
export type EnrollProgramInput = z.infer<typeof enrollProgramSchema>;
