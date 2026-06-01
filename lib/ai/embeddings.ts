// OpenAI embeddings helper. Used by both the ingest script (server/node) and
// the RAG retrieval at query time.

import 'server-only';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS = 1536;

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { prompt_tokens: number; total_tokens: number };
}

/**
 * Embed one or many strings. Returns an array of vectors in the same order.
 * Batches are capped at 100 inputs per request (OpenAI limit is higher but
 * 100 keeps payloads small).
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 300)}`);
  }

  const json: EmbeddingResponse = await res.json();
  // Ensure order matches input order.
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed a single string. */
export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v;
}

/** Format a JS number[] as a pgvector literal string: '[0.1,0.2,...]' */
export function toPgVector(v: number[]): string {
  return `[${v.join(',')}]`;
}
