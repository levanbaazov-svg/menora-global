// Labels, categories, Zod schemas for interest groups.

import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

// ── Group categories ─────────────────────────────────────────────────────────
export const GROUP_CATEGORIES = [
  'learning',   // Torah study, Hebrew, parsha circles
  'social',     // Coffee meetups, Shabbat dinners, hangouts
  'wellness',   // Yoga, fitness, mental health, mindfulness
  'family',     // Moms, dads, parenting, kids playdates
  'cooking',    // Shared meals, kosher cooking, baking
  'business',   // Networking, founders, professionals
  'arts',       // Music, writing, painting
  'sports',     // Hiking, running, basketball
  'travel',     // Trips to Israel, weekend getaways
  'volunteer',  // Chesed projects, community service
] as const;
export type GroupCategory = typeof GROUP_CATEGORIES[number];

export const GROUP_CATEGORY_LABELS: Record<
  GroupCategory,
  { ru: string; en: string; he: string; emoji: string; gradient: string }
> = {
  learning:  { ru: 'Учёба',        en: 'Learning',  he: 'לימוד',     emoji: '📚', gradient: 'from-amber-300 to-orange-500' },
  social:    { ru: 'Общение',      en: 'Social',    he: 'חברה',      emoji: '☕', gradient: 'from-rose-300 to-pink-500' },
  wellness:  { ru: 'Здоровье',     en: 'Wellness',  he: 'בריאות',    emoji: '🧘', gradient: 'from-emerald-300 to-teal-500' },
  family:    { ru: 'Семьи',        en: 'Family',    he: 'משפחות',    emoji: '👨‍👩‍👧', gradient: 'from-violet-300 to-purple-500' },
  cooking:   { ru: 'Кулинария',    en: 'Cooking',   he: 'בישול',     emoji: '🍳', gradient: 'from-yellow-300 to-amber-500' },
  business:  { ru: 'Бизнес',       en: 'Business',  he: 'עסקים',     emoji: '💼', gradient: 'from-slate-400 to-slate-700' },
  arts:      { ru: 'Искусство',    en: 'Arts',      he: 'אמנות',     emoji: '🎨', gradient: 'from-fuchsia-300 to-pink-500' },
  sports:    { ru: 'Спорт',        en: 'Sports',    he: 'ספורט',     emoji: '⚽', gradient: 'from-sky-300 to-blue-500' },
  travel:    { ru: 'Путешествия',  en: 'Travel',    he: 'טיולים',    emoji: '✈️', gradient: 'from-cyan-300 to-blue-400' },
  volunteer: { ru: 'Волонтёрство', en: 'Volunteer', he: 'התנדבות',   emoji: '🤝', gradient: 'from-lime-300 to-green-500' },
};

// ── Visibility ───────────────────────────────────────────────────────────────
export const GROUP_VISIBILITY = ['public', 'community', 'invite_only'] as const;
export type GroupVisibility = typeof GROUP_VISIBILITY[number];

export const VISIBILITY_LABELS: Record<GroupVisibility, { ru: string; hint: string }> = {
  public:      { ru: 'Открытая',      hint: 'Видна и доступна для вступления из любой общины' },
  community:   { ru: 'Только община', hint: 'Видна только участникам твоей общины' },
  invite_only: { ru: 'По приглашению', hint: 'Только админы могут приглашать новых' },
};

// ── Zod schemas ──────────────────────────────────────────────────────────────
export const createGroupSchema = z.object({
  category:         z.enum(GROUP_CATEGORIES),
  name:             trimmed.pipe(z.string().min(2, 'Название обязательно').max(120)),
  description:      z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
  photo_url:        z.string().url('Нужна ссылка на фото')
                     .optional().or(z.literal('').transform(() => undefined)),
  visibility:       z.enum(GROUP_VISIBILITY).optional().default('community'),
  frequency:        z.string().max(60).optional().transform((v) => v?.trim() || undefined),
  meeting_location: z.string().max(200).optional().transform((v) => v?.trim() || undefined),
  meeting_place_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  tags:             z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    if (!v) return [];
    const arr = Array.isArray(v) ? v : v.split(',');
    return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 12);
  }),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = createGroupSchema.extend({
  group_id: z.string().uuid(),
});
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const groupIdSchema = z.object({ group_id: z.string().uuid() });
export type GroupIdInput = z.infer<typeof groupIdSchema>;
