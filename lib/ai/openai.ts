// OpenAI client wrapper — single source for model + API key config.
// Server-only: only ever imported from server actions and API routes.

import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // Don't throw at import time — let the route return a clear error message
  // so a misconfigured deploy doesn't kill the whole build.
  // eslint-disable-next-line no-console
  console.warn(
    '[ai] OPENAI_API_KEY is not set. AI Rabbi will return a configuration error.',
  );
}

export const openai = createOpenAI({
  apiKey: apiKey ?? 'missing',
  // Allow up to 3 retries on transient OpenAI 429/5xx
  // (defaults are fine, but spelling out for clarity).
});

/** The model we use for AI Rabbi. Cheap, fast, good enough for Russian chat. */
export const AI_MODEL = 'gpt-4o-mini';

export function isAIConfigured(): boolean {
  return Boolean(apiKey);
}
