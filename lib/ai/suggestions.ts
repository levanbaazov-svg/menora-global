// Daily proactive AI card for the dashboard home.
//
// Goals:
//  - Personal, warm, 1-2 sentences + a single concrete CTA
//  - Cheap: cache per user per day (one call/day max)
//  - Resilient: static fallback rotation when OPENAI_API_KEY is missing
//    or when the API returns an error
//
// Storage: users.ai_home_suggestion (jsonb) + ai_home_suggestion_date (date).

import 'server-only';
import { hasuraAdmin } from '@/lib/hasura';
import { generateText } from 'ai';
import { getTranslations } from 'next-intl/server';
import { openai, AI_MODEL, isAIConfigured } from './openai';
import { buildUserContext } from './context';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { z } from 'zod';

const LANGUAGE_NAME: Record<Locale, string> = {
  ru: 'русском языке',
  en: 'English',
  he: 'בעברית (Hebrew)',
};

// ── Output shape ─────────────────────────────────────────────────────────
export const homeSuggestionSchema = z.object({
  emoji: z.string().min(1).max(8),
  title: z.string().min(2).max(80),
  body:  z.string().min(2).max(220),
  cta_label: z.string().min(2).max(40),
  cta_href:  z.string().min(2).max(120),
});

export type HomeSuggestion = z.infer<typeof homeSuggestionSchema>;

// ── Static fallback pool (rotates by day-of-year) ────────────────────────
const FALLBACK_POOL: HomeSuggestion[] = [
  {
    emoji: '🕯',
    title: 'Шаббат уже близко',
    body: 'Проверь время свечей в своей общине — а заодно есть ли куда пойти на ужин.',
    cta_label: 'Открыть общину',
    cta_href: '/dashboard/community',
  },
  {
    emoji: '✦',
    title: 'Что-то для души',
    body: 'Сегодняшняя короткая мудрость — 3 минуты чтения. Не каждый день нужно много.',
    cta_label: 'Открыть Inspire',
    cta_href: '/dashboard/inspire',
  },
  {
    emoji: '🤝',
    title: 'Хочешь найти своих?',
    body: 'Группы по интересам — учёба, спорт, мамы, кулинария. Может, есть твоя.',
    cta_label: 'Открыть Связь',
    cta_href: '/dashboard/connect',
  },
  {
    emoji: '📅',
    title: 'События общины',
    body: 'Шаббатние ужины, лекции, мероприятия для детей — глянь что предстоит.',
    cta_label: 'Открыть события',
    cta_href: '/dashboard/events',
  },
  {
    emoji: '🪪',
    title: 'Твой Jewish ID',
    body: 'Цифровой паспорт с QR — в любой общине Menorah тебя подтвердят. Покажешь?',
    cta_label: 'Открыть карту',
    cta_href: '/dashboard/me/jewish-id',
  },
  {
    emoji: '💬',
    title: 'AI Раввин ждёт',
    body: 'Глубокий разговор, парша недели или просто рядом — выбери сценарий.',
    cta_label: 'Открыть AI Раввина',
    cta_href: '/dashboard/ai-rabbi',
  },
];

function dayOfYear(date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

function pickFallback(date = new Date()): HomeSuggestion {
  return FALLBACK_POOL[dayOfYear(date) % FALLBACK_POOL.length];
}

// ── Cache helpers ────────────────────────────────────────────────────────
const FETCH_CACHE = /* GraphQL */ `
  query FetchAiCache($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      ai_home_suggestion ai_home_suggestion_date
    }
  }
`;

const STORE_CACHE = /* GraphQL */ `
  mutation StoreAiCache($user_id: uuid!, $payload: jsonb!, $today: date!) {
    update_users_by_pk(
      pk_columns: { id: $user_id }
      _set: { ai_home_suggestion: $payload, ai_home_suggestion_date: $today }
    ) { id }
  }
`;

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readCache(userId: string, locale: Locale): Promise<HomeSuggestion | null> {
  const r = await hasuraAdmin.request<{
    users_by_pk: {
      ai_home_suggestion: unknown;
      ai_home_suggestion_date: string | null;
    } | null;
  }>(FETCH_CACHE, { user_id: userId });

  const row = r.users_by_pk;
  if (!row || row.ai_home_suggestion_date !== isoToday()) return null;
  // Bust the cache when the stored suggestion is in a different language.
  const stored = row.ai_home_suggestion as { _locale?: string } | null;
  if (stored && stored._locale && stored._locale !== locale) return null;
  const parsed = homeSuggestionSchema.safeParse(row.ai_home_suggestion);
  return parsed.success ? parsed.data : null;
}

async function writeCache(userId: string, payload: HomeSuggestion, locale: Locale): Promise<void> {
  await hasuraAdmin.request(STORE_CACHE, {
    user_id: userId,
    payload: { ...payload, _locale: locale },
    today: isoToday(),
  });
}

// ── Activity snapshot (makes the suggestion genuinely proactive) ───────────
const ACTIVITY = /* GraphQL */ `
  query HomeActivity($uid: uuid!, $cid: uuid!, $now: timestamptz!, $today: date!) {
    my_rsvps: rsvps_aggregate(where: {
      user_id: { _eq: $uid }, status: { _eq: yes }, event: { starts_at: { _gte: $now } }
    }) { aggregate { count } }
    next_rsvp: rsvps(where: {
      user_id: { _eq: $uid }, status: { _eq: yes }, event: { starts_at: { _gte: $now } }
    }, order_by: { event: { starts_at: asc } }, limit: 1) { event { title starts_at } }

    upcoming_events: events_aggregate(where: {
      community_id: { _eq: $cid }, status: { _eq: published }, starts_at: { _gte: $now }
    }) { aggregate { count } }
    not_rsvped: events(where: {
      community_id: { _eq: $cid }, status: { _eq: published }, starts_at: { _gte: $now },
      _not: { rsvps: { user_id: { _eq: $uid } } }
    }, order_by: { starts_at: asc }, limit: 1) { title starts_at }

    joinable_groups: interest_groups_aggregate(where: {
      community_id: { _eq: $cid }, archived_at: { _is_null: true },
      _not: { memberships: { user_id: { _eq: $uid }, left_at: { _is_null: true } } }
    }) { aggregate { count } }

    open_requests: requests_aggregate(where: {
      community_id: { _eq: $cid }, status: { _eq: open }
    }) { aggregate { count } }

    routines: routines(where: { user_id: { _eq: $uid }, enabled: { _eq: true } }) {
      id
      done: checkins(where: { user_id: { _eq: $uid }, gregorian_date: { _eq: $today } }) { id }
    }
  }
`;

interface ActivityResp {
  my_rsvps: { aggregate: { count: number } | null };
  next_rsvp: Array<{ event: { title: string; starts_at: string } | null }>;
  upcoming_events: { aggregate: { count: number } | null };
  not_rsvped: Array<{ title: string; starts_at: string }>;
  joinable_groups: { aggregate: { count: number } | null };
  open_requests: { aggregate: { count: number } | null };
  routines: Array<{ id: string; done: Array<{ id: string }> }>;
}

/** Build a compact, factual activity block for the model (kept in Russian —
 *  it's context, the model still answers in the target language). */
async function buildActivitySnapshot(userId: string, communityId: string | null): Promise<string> {
  if (!communityId || communityId === '00000000-0000-0000-0000-000000000000') return '';
  try {
    const d = await hasuraAdmin.request<ActivityResp>(ACTIVITY, {
      uid: userId, cid: communityId, now: new Date().toISOString(), today: isoToday(),
    });
    const lines: string[] = [];
    const n = (a: { aggregate: { count: number } | null }) => a.aggregate?.count ?? 0;

    const myRsvps = n(d.my_rsvps);
    if (myRsvps > 0 && d.next_rsvp[0]?.event) {
      const e = d.next_rsvp[0].event;
      lines.push(`Записан на ${myRsvps} предстоящих событий; ближайшее: «${e.title}» (${e.starts_at.slice(0, 10)}).`);
    } else {
      lines.push('Пока не записан ни на одно предстоящее событие.');
    }
    const upcoming = n(d.upcoming_events);
    if (upcoming > 0) {
      const sample = d.not_rsvped[0];
      lines.push(`Всего предстоящих событий в общине: ${upcoming}${sample ? `; новое для него: «${sample.title}» (${sample.starts_at.slice(0, 10)})` : ''}.`);
    }
    const joinable = n(d.joinable_groups);
    if (joinable > 0) lines.push(`Групп по интересам, где его ещё нет: ${joinable}.`);
    const openReq = n(d.open_requests);
    if (openReq > 0) lines.push(`Открытых просьб о помощи в общине: ${openReq}.`);

    const routinesTotal = d.routines.length;
    if (routinesTotal > 0) {
      const doneToday = d.routines.filter((r) => r.done.length > 0).length;
      lines.push(`Молитвенные рутины сегодня: выполнено ${doneToday} из ${routinesTotal}.`);
    } else {
      lines.push('Молитвенные рутины ещё не настроены.');
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ── AI generation ────────────────────────────────────────────────────────
function buildPrompt(
  userName: string | null,
  communityName: string | null,
  parsha: string | null,
  role: string | null,
  languageName: string,
  activity: string,
) {
  return `Ты — проактивный AI помощник в приложении Menorah Global (сеть еврейских общин). Сгенерируй ОДНУ короткую персональную подсказку для главной страницы пользователя на сегодня.

ВАЖНО: весь текст (title, body, cta_label) должен быть на ${languageName}.

Контекст:
- Имя: ${userName ?? 'неизвестно'}
- Община: ${communityName ?? 'без активной общины'}
- Роль: ${role ?? 'без членства'}
${parsha ? `- Парша недели (используй только если это уместно, не делай это темой по умолчанию): ${parsha}` : ''}
${activity ? `\n=== Реальная активность пользователя (ОПИРАЙСЯ на это в первую очередь) ===\n${activity}\n` : ''}
Что делает хорошую подсказку:
- ГЛАВНОЕ: исходи из «Реальной активности» выше и подтолкни к самому уместному КОНКРЕТНОМУ шагу. Примеры логики: если он не записан ни на одно событие, а в общине есть предстоящие — предложи записаться на конкретное; если записан — мягко напомни про ближайшее; если не выполнил сегодня рутины — предложи отметить; если не состоит в группах — предложи найти своих; если есть открытые просьбы — предложи помочь.
- Будь конкретным: если в активности есть название события/число — используй его в подсказке (например «Вижу, ты ещё не записался на „…“ — пойдём?»).
- НЕ делай подсказку про парашу по умолчанию — только если это реально уместно.
- Тёплая, личная, без шаблонных фраз. 1-2 предложения максимум для body. Эмоциональный заголовок.
- Ровно одно действие (CTA), ведущее на самую релевантную страницу.

CTA должен быть на одну из этих страниц:
- /dashboard/community — город-гид общины (места, программы, события)
- /dashboard/connect — группы по интересам
- /dashboard/events — события
- /dashboard/inspire — библиотека мудростей и историй
- /dashboard/ai-rabbi — AI раввин 6 сценариев
- /dashboard/ai-rabbi/parsha — парша недели в AI
- /dashboard/ai-rabbi/shabbat — спланировать шаббат
- /dashboard/me/jewish-id — Jewish ID карта с QR
- /dashboard/routines — рутины и стрик молитв

Верни СТРОГО JSON с полями: emoji (1 эмодзи), title (заголовок до 60 символов), body (1-2 предложения), cta_label (короткая фраза для кнопки, до 30 символов), cta_href (одна из URL выше).

НЕ оборачивай в \`\`\`json\`\`\`. Просто JSON.`;
}

async function callAI(userId: string, locale: Locale, communityId: string | null): Promise<HomeSuggestion | null> {
  if (!isAIConfigured()) return null;
  try {
    const [ctx, activity] = await Promise.all([
      buildUserContext(userId, null),
      buildActivitySnapshot(userId, communityId),
    ]);
    const prompt = buildPrompt(ctx.userName, ctx.communityName, ctx.parsha, ctx.role, LANGUAGE_NAME[locale], activity);

    const result = await generateText({
      model: openai(AI_MODEL),
      prompt,
      temperature: 0.85,
    });

    // The Vercel AI SDK returns a UIMessage-like structure; pull .text.
    const text = result.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const json = JSON.parse(text);
    const parsed = homeSuggestionSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ai/suggestions] generation failed, using fallback:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────
/**
 * Returns today's home suggestion for the user.
 * Reads cache first; if expired/missing, tries AI, then falls back to
 * a static rotating tip.
 *
 * Safe to call on every dashboard render — limited to 1 AI call/day/user.
 */
export async function getDailyHomeSuggestion(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
  communityId: string | null = null,
): Promise<HomeSuggestion> {
  // 1. Cache hit (same day + same language)?
  const cached = await readCache(userId, locale);
  if (cached) return cached;

  // 2. Try AI (grounded in the user's real activity)
  const generated = await callAI(userId, locale, communityId);
  if (generated) {
    await writeCache(userId, generated, locale).catch(() => {/* non-fatal */});
    return generated;
  }

  // 3. Localized static fallback (don't cache — try again tomorrow)
  return localizedFallback(locale);
}

/** Pick a localized fallback suggestion, rotating by day-of-year. */
async function localizedFallback(locale: Locale): Promise<HomeSuggestion> {
  try {
    const t = await getTranslations({ locale, namespace: 'home' });
    const pool = t.raw('fallbacks') as HomeSuggestion[];
    if (Array.isArray(pool) && pool.length > 0) {
      return pool[dayOfYear() % pool.length];
    }
  } catch {
    // fall through to the static RU pool
  }
  return pickFallback();
}
