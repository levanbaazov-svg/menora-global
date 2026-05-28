// AI cover image generation for events (and maybe places/programs later).
//
// Returns a base64 PNG data URL — small enough to store inline in cover_image_url
// text columns. No cloud storage needed for v1.
//
// Uses OpenAI's gpt-image-1 (modern successor to DALL-E 3).

import 'server-only';
import { isAIConfigured } from './openai';

export interface CoverGenResult {
  ok: boolean;
  /** data URL: data:image/png;base64,... */
  dataUrl?: string;
  error?: string;
}

export interface CoverPrompt {
  title: string;
  type?: string;       // 'shabbat_dinner', 'lecture', etc.
  description?: string;
  communityCity?: string;
}

function buildImagePrompt(p: CoverPrompt): string {
  const eventType = p.type ? ` — ${p.type.replace(/_/g, ' ')}` : '';
  const place = p.communityCity ? ` in ${p.communityCity}` : '';
  return [
    `Warm, inviting illustration for a Jewish community event card: "${p.title}"${eventType}${place}.`,
    p.description
      ? `Context: ${p.description.slice(0, 300)}.`
      : '',
    'Style: soft hand-painted illustration, warm golden hour light, subtle Jewish iconography (menorah, candles, challah, Hebrew letters) only when relevant.',
    'No photo-realistic faces. No text in the image. Colors: warm cream, deep navy, soft gold accents.',
    'Aspect: 16:9 landscape, suitable for a card hero.',
  ].filter(Boolean).join(' ');
}

export async function generateEventCover(p: CoverPrompt): Promise<CoverGenResult> {
  if (!isAIConfigured()) {
    return { ok: false, error: 'AI пока не настроен — нет OPENAI_API_KEY' };
  }
  if (!p.title || p.title.trim().length < 2) {
    return { ok: false, error: 'Сначала укажи название события' };
  }

  const apiKey = process.env.OPENAI_API_KEY!;
  const prompt = buildImagePrompt(p);

  try {
    // gpt-image-1 returns base64 directly (unlike DALL-E 3 which returns a URL).
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024',     // 3:2 landscape — closest aspect to 16:9 supported
        quality: 'low',         // 'low' is plenty for a card cover; ~$0.011 per image
        n: 1,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      let msg = errBody;
      try {
        const j = JSON.parse(errBody);
        msg = j.error?.message ?? errBody;
      } catch { /* keep raw */ }
      return { ok: false, error: `OpenAI: ${msg.slice(0, 200)}` };
    }

    const body: { data?: Array<{ b64_json?: string }> } = await res.json();
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: 'Пустой ответ от OpenAI' };

    return {
      ok: true,
      dataUrl: `data:image/png;base64,${b64}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}
