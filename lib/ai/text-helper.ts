// AI description helper — turns a few keywords or a draft into a polished
// Russian description for places, programs, groups, events.
//
// Used from a small inline button in create-X forms.

import 'server-only';
import { generateText } from 'ai';
import { openai, AI_MODEL, isAIConfigured } from './openai';

export type ContentKind =
  | 'place_synagogue'
  | 'place_restaurant'
  | 'place_cafe'
  | 'place_store'
  | 'place_generic'
  | 'program'
  | 'group'
  | 'event';

const PROMPTS: Record<ContentKind, { role: string; goal: string }> = {
  place_synagogue: {
    role: 'админ еврейской общины',
    goal: 'описание синагоги — что внутри, кому подходит, есть ли женское отделение, kashrut authority, особые мероприятия',
  },
  place_restaurant: {
    role: 'админ еврейской общины',
    goal: 'описание кошерного ресторана — кухня, атмосфера, для каких случаев, кашрутный сертификат',
  },
  place_cafe: {
    role: 'админ еврейской общины',
    goal: 'описание кошерного кафе — атмосфера, что подают, кашрут, удобство для семей',
  },
  place_store: {
    role: 'админ еврейской общины',
    goal: 'описание кошерного магазина — что продают, кашрут на полках, удобство расположения',
  },
  place_generic: {
    role: 'админ еврейской общины',
    goal: 'описание места — что это, кому полезно, чем особенно',
  },
  program: {
    role: 'раввин или организатор программы',
    goal: 'описание программы — для кого, что внутри, расписание, чего ожидать на первой встрече',
  },
  group: {
    role: 'создатель группы по интересам',
    goal: 'описание группы — для кого, чем занимаемся, формат встреч, как присоединиться',
  },
  event: {
    role: 'хост события',
    goal: 'описание события — что будет, для кого, что взять, программа, атмосфера',
  },
};

export interface ImproveResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export async function improveDescription(
  draft: string,
  kind: ContentKind,
  hint?: { name?: string; communityName?: string },
): Promise<ImproveResult> {
  if (!isAIConfigured()) {
    return { ok: false, error: 'AI пока не настроен — нет OPENAI_API_KEY на сервере' };
  }
  const cleaned = draft.trim();
  if (cleaned.length === 0) {
    return { ok: false, error: 'Сначала напиши несколько слов — AI улучшит, не сочинит с нуля' };
  }
  if (cleaned.length > 1500) {
    return { ok: false, error: 'Слишком длинный текст — сократи до 1500 символов' };
  }

  const meta = PROMPTS[kind];
  const prompt = `Ты — ${meta.role}, помогаешь оформить ${meta.goal}.

${hint?.name ? `Название: ${hint.name}\n` : ''}${hint?.communityName ? `Община: ${hint.communityName}\n` : ''}
Черновик от пользователя:
"""
${cleaned}
"""

Сделай из этого профессиональное, тёплое, конкретное описание на русском. Без воды, без рекламы, без шаблонов типа "уютная атмосфера". 2-4 коротких абзаца. Сохрани все факты из черновика, добавь только то что подразумевается. Не выдумывай конкретику (имена, цены, даты) которой нет в черновике.

Верни ТОЛЬКО улучшенный текст, без преамбулы и без обёртки.`;

  try {
    const result = await generateText({
      model: openai(AI_MODEL),
      prompt,
      temperature: 0.7,
    });
    const text = result.text.trim();
    if (!text) return { ok: false, error: 'Пустой ответ от AI — попробуй ещё раз' };
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'AI вернул ошибку',
    };
  }
}
