// Retrieval-Augmented Generation for the AI Rabbi.
//
// Flow: embed the user's question → cosine-search torah_sources via the
// match_torah_sources SQL function → (optional) LLM rerank → format the top
// chunks into a context block injected into the system prompt.

import 'server-only';
import { hasuraAdmin } from '@/lib/hasura';
import { embedOne, toPgVector } from './embeddings';

export interface RetrievedSource {
  id: string;
  collection: string;
  ref: string;
  title: string;
  author: string | null;
  category: string | null;
  text_en: string | null;
  text_ru: string | null;
}

// We call the tracked SQL function via a raw run_sql query (admin endpoint),
// because Hasura's GraphQL function args don't accept a vector type cleanly.
const SQL_URL = (process.env.HASURA_GRAPHQL_ENDPOINT ?? '').replace(/\/v1\/graphql\/?$/, '') + '/v2/query';

async function runSql(sql: string): Promise<unknown[][]> {
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? '',
    },
    body: JSON.stringify({
      type: 'run_sql',
      args: { source: 'default', read_only: true, sql },
    }),
  });
  if (!res.ok) throw new Error(`run_sql ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.result ?? [];
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Retrieve the top-K most relevant Torah-source chunks for a query.
 * Returns [] if RAG isn't configured (no embeddings / empty table) — the
 * caller should degrade gracefully (answer without sources).
 */
export async function retrieveSources(
  query: string,
  opts: { k?: number; collection?: string } = {},
): Promise<RetrievedSource[]> {
  const k = opts.k ?? 8;

  let vector: number[];
  try {
    vector = await embedOne(query);
  } catch {
    return []; // no OpenAI / quota — degrade to no-RAG
  }

  const vecLiteral = toPgVector(vector);
  const collFilter = opts.collection
    ? `AND collection = '${escapeSqlString(opts.collection)}'`
    : '';

  const sql = `
    SELECT id, collection, ref, title, author, category, text_en, text_ru
    FROM public.torah_sources
    WHERE embedding IS NOT NULL ${collFilter}
    ORDER BY embedding <=> '${vecLiteral}'::vector
    LIMIT ${k};
  `;

  let rows: unknown[][];
  try {
    rows = await runSql(sql);
  } catch {
    return [];
  }
  if (rows.length <= 1) return []; // first row is the column header

  const [header, ...data] = rows as string[][];
  const idx = (name: string) => header.indexOf(name);
  return data.map((r) => ({
    id: r[idx('id')],
    collection: r[idx('collection')],
    ref: r[idx('ref')],
    title: r[idx('title')],
    author: r[idx('author')] || null,
    category: r[idx('category')] || null,
    text_en: r[idx('text_en')] || null,
    text_ru: r[idx('text_ru')] || null,
  }));
}

/**
 * Format retrieved sources into a context block for the system prompt.
 * Each source is numbered so the model can cite [1], [2]… and we can show a
 * "Sources" list under the answer.
 */
export function formatSourcesForPrompt(sources: RetrievedSource[]): string {
  if (sources.length === 0) return '';
  const blocks = sources.map((s, i) => {
    const body = (s.text_ru || s.text_en || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
    return `[${i + 1}] ${s.title}${s.author ? ` (${s.author})` : ''}\n${body}`;
  });
  return `Релевантные источники из еврейской традиции (используй их в ответе, ссылайся как [1], [2]…):\n\n${blocks.join('\n\n')}`;
}
