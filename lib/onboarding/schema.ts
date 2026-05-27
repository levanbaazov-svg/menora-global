// Zod schemas for each onboarding step. Used both client-side (for form
// validation hints) and server-side (in actions) — the latter is authoritative.

import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());
const optionalText = z.string().transform((s) => s.trim()).pipe(z.string().min(1)).optional().or(z.literal('').transform(() => undefined));

// Tolerant phone parser. Accepts `+972501234567`, `+972 50 123-4567`,
// `972501234567`, `050-1234567` (assumes Israel if no country code).
// Normalizes to strict E.164 `+<digits>`.
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^\d{10,15}$/.test(cleaned)) return '+' + cleaned;
  // Israeli local format starting with 0 → +972
  if (/^0\d{8,9}$/.test(cleaned)) return '+972' + cleaned.slice(1);
  return null;
}

// ── Identity (required) ─────────────────────────────────────────────────────
export const identitySchema = z.object({
  legal_first_name: trimmed.pipe(z.string().min(1, 'Имя обязательно').max(120)),
  legal_last_name:  trimmed.pipe(z.string().min(1, 'Фамилия обязательна').max(120)),
  hebrew_name:      trimmed.pipe(z.string().min(1, 'Еврейское имя обязательно').max(200)),
  gender:           z.enum(['male', 'female', 'other', 'prefer_not_say'], { message: 'Выбери пол' }),
  date_of_birth:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажи дату рождения'),
  phone_e164:       z.string().transform((v, ctx) => {
    const n = normalizePhone(v ?? '');
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Например: +972501234567 или 050-1234567' });
      return z.NEVER;
    }
    return n;
  }),
});
export type IdentityInput = z.infer<typeof identitySchema>;

// ── Family (optional) ───────────────────────────────────────────────────────
export const familySchema = z.object({
  marital_status:     z.enum(['single','engaged','married','divorced','widowed']).optional(),
  has_children:       z.coerce.boolean().optional(),
  // CSV input like "4, 7, 11" — split + parse
  children_ages_csv:  z.string().optional().transform((v) => {
    if (!v) return [] as number[];
    return v.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 30);
  }),
  spouse_hebrew_name: optionalText,
});
export type FamilyInput = z.infer<typeof familySchema>;

// ── Religious (required) ────────────────────────────────────────────────────
export const religiousSchema = z.object({
  denomination:     z.enum(['reform','conservative','modern_orthodox','orthodox','chabad','sephardi','reconstructionist','secular','other']),
  observance_level: z.enum(['curious','traditional','observant','strictly_observant']),
  kashrut_level:    z.enum(['none','basic','strict','mehadrin']),
});
export type ReligiousInput = z.infer<typeof religiousSchema>;

// ── Interests (optional) ────────────────────────────────────────────────────
const KNOWN_INTERESTS = [
  'torah_learning','prayer','social','volunteering','parenting','sports',
  'music','cooking','hebrew','israel','arts','outdoors','meditation',
] as const;
const KNOWN_LANGUAGES = ['en','he','ru','fr','es','de','yi'] as const;

export const interestsSchema = z.object({
  // multi-checkbox arrives as array of strings or single string from FormData
  interests: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    const arr = !v ? [] : Array.isArray(v) ? v : [v];
    return arr.filter((s): s is typeof KNOWN_INTERESTS[number] =>
      (KNOWN_INTERESTS as readonly string[]).includes(s));
  }),
  languages: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    const arr = !v ? [] : Array.isArray(v) ? v : [v];
    const filtered = arr.filter((s): s is typeof KNOWN_LANGUAGES[number] =>
      (KNOWN_LANGUAGES as readonly string[]).includes(s));
    return filtered.length ? filtered : ['en'];
  }),
  bio: optionalText.pipe(z.string().max(2000).optional()),
});
export type InterestsInput = z.infer<typeof interestsSchema>;

export const INTERESTS = KNOWN_INTERESTS;
export const LANGUAGES = KNOWN_LANGUAGES;

// ── Community choice (self-signup only) ────────────────────────────────────
export const communityChoiceSchema = z.object({
  community_id:     z.string().uuid(),
  request_message:  trimmed.pipe(z.string().min(10, 'Минимум 10 символов').max(2000)),
});
export type CommunityChoiceInput = z.infer<typeof communityChoiceSchema>;

// ── Privacy (required) ──────────────────────────────────────────────────────
export const privacySchema = z.object({
  profile_visibility: z.enum(['community','members_only','private']),
  notify_email:       z.coerce.boolean().optional().default(true),
  notify_push:        z.coerce.boolean().optional().default(true),
  notify_events:      z.coerce.boolean().optional().default(true),
  notify_requests:    z.coerce.boolean().optional().default(true),
  notify_prayers:     z.coerce.boolean().optional().default(true),
  notify_community:   z.coerce.boolean().optional().default(true),
});
export type PrivacyInput = z.infer<typeof privacySchema>;
