// Hasura HTTP client used by migrations.
//
// Sends DDL through /v2/query (run_sql) and metadata operations through
// /v1/metadata (pg_track_table). No direct Postgres connection — everything
// goes through Hasura, so it picks up RLS-relevant metadata automatically.

'use strict';

require('dotenv').config();

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const source = process.env.HASURA_DATA_SOURCE || 'default';

if (!endpoint || !adminSecret) {
  console.error(
    'HASURA_GRAPHQL_ENDPOINT and HASURA_GRAPHQL_ADMIN_SECRET must be set.\n' +
    'Copy .env.example to .env and fill them in.',
  );
  process.exit(1);
}

// /v1/graphql → siblings /v2/query (SQL) and /v1/metadata (track/untrack).
const baseUrl = endpoint.replace(/\/v1\/graphql\/?$/, '');
const sqlURL = `${baseUrl}/v2/query`;
const metadataURL = `${baseUrl}/v1/metadata`;

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': adminSecret,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json.error || (json.code && !json.result_type)) {
    const detail = json.error || json.internal?.error?.message || json.message || text;
    const err = new Error(`Hasura ${res.status}: ${detail}`);
    err.payload = json;
    throw err;
  }
  return json;
}

async function runSQL(sql, opts = {}) {
  return post(sqlURL, {
    type: 'run_sql',
    args: {
      source: opts.source || source,
      sql,
      // cascade=true → Hasura drops dependent metadata when objects are dropped.
      cascade: opts.cascade !== false,
      read_only: !!opts.readOnly,
    },
  });
}

async function trackTable(name, schema = 'public') {
  try {
    return await post(metadataURL, {
      type: 'pg_track_table',
      args: { source, table: { schema, name } },
    });
  } catch (e) {
    // already-tracked is fine
    if (e.message.includes('already tracked')) return;
    throw e;
  }
}

async function untrackTable(name, schema = 'public') {
  try {
    return await post(metadataURL, {
      type: 'pg_untrack_table',
      args: { source, table: { schema, name }, cascade: true },
    });
  } catch (e) {
    if (e.message.includes('not tracked') || e.message.includes('does not exist')) return;
    throw e;
  }
}

async function trackAll(tableNames, schema = 'public') {
  for (const name of tableNames) await trackTable(name, schema);
}

async function untrackAll(tableNames, schema = 'public') {
  for (const name of tableNames) await untrackTable(name, schema);
}

module.exports = { runSQL, trackTable, untrackTable, trackAll, untrackAll };
