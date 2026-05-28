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
import { openai, AI_MODEL, isAIConfigured } from './openai';
import { buildUserContext } from './context';
import { z } from 'zod';

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

async function readCache(userId: string): Promise<HomeSuggestion | null> {
  const r = await hasuraAdmin.request<{
    users_by_pk: {
      ai_home_suggestion: unknown;
      ai_home_suggestion_date: string | null;
    } | null;
  }>(FETCH_CACHE, { user_id: userId });

  const row = r.users_by_pk;
  if (!row || row.ai_home_suggestion_date !== isoToday()) return null;
  const parsed = homeSuggestionSchema.safeParse(row.ai_home_suggestion);
  return parsed.success ? parsed.data : null;
}

async function writeCache(userId: string, payload: HomeSuggestion): Promise<void> {
  await hasuraAdmin.request(STORE_CACHE, {
    user_id: userId,
    payload,
    today: isoToday(),
  });
}

// ── AI generation ────────────────────────────────────────────────────────
function buildPrompt(userName: string | null, communityName: string | null, parsha: string | null, role: string | null) {
  return `Ты — AI помощник в приложении Menorah Global (сеть еврейских общин). Сгенерируй ОДНУ короткую персональную подсказку для главной страницы пользователя на сегодня.

Контекст:
- Имя: ${userName ?? 'неизвестно'}
- Община: ${communityName ?? 'без активной общины'}
- Роль: ${role ?? 'без членства'}
- Парша недели: ${parsha ?? 'неизвестна'}
- Сегодняшняя дата: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: '2-digit', month: 'long' })}

Требования к подсказке:
- Тёплая, личная, без шаблонности
- 1-2 предложения максимум для body
- Эмоциональный заголовок (НЕ "Ваша подсказка дня")
- Одно конкретное действие (CTA)

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

async function callAI(userId: string): Promise<HomeSuggestion | null> {
  if (!isAIConfigured()) return null;
  try {
    const ctx = await buildUserContext(userId, null);
    const prompt = buildPrompt(ctx.userName, ctx.communityName, ctx.parsha, ctx.role);

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
export async function getDailyHomeSuggestion(userId: string): Promise<HomeSuggestion> {
  // 1. Cache hit?
  const cached = await readCache(userId);
  if (cached) return cached;

  // 2. Try AI
  const generated = await callAI(userId);
  if (generated) {
    await writeCache(userId, generated).catch(() => {/* non-fatal */});
    return generated;
  }

  // 3. Static fallback (don't cache — try again tomorrow)
  return pickFallback();
}
