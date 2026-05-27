// Custom state store for the `migrate` package — keeps history inside
// Hasura/Postgres via run_sql, instead of a local .migrate file.
//
// Usage: `migrate up --store=./scripts/migrate-store.js`
//
// `migrate` instantiates this as `new Store(stateFile)`.

'use strict';

const { runSQL } = require('./hasura');

const ENSURE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

function parseState(res) {
  // run_sql TuplesOk: { result_type, result: [[col], [val], ...] }
  const rows = (res && res.result) || [];
  if (rows.length < 2) return {};
  const raw = rows[1][0];
  if (typeof raw === 'object' && raw !== null) return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

class HasuraStore {
  constructor() {
    this.ensured = false;
  }

  async _ensure() {
    if (this.ensured) return;
    await runSQL(ENSURE_TABLE_SQL);
    this.ensured = true;
  }

  load(fn) {
    this._ensure()
      .then(() => runSQL(
        `SELECT value FROM public.schema_migrations WHERE key = 'state';`,
        { readOnly: true },
      ))
      .then((res) => fn(null, parseState(res)))
      .catch(fn);
  }

  save(set, fn) {
    const payload = {
      lastRun: set.lastRun || null,
      migrations: (set.migrations || []).map((m) => ({
        title: m.title,
        timestamp: m.timestamp || null,
        description: m.description || null,
      })),
    };
    const json = JSON.stringify(payload).replace(/'/g, "''");
    this._ensure()
      .then(() => runSQL(`
        INSERT INTO public.schema_migrations (key, value, updated_at)
        VALUES ('state', '${json}'::jsonb, now())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = now();
      `))
      .then(() => fn())
      .catch(fn);
  }
}

module.exports = HasuraStore;
