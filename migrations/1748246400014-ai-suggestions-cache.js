'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'cache columns on users for daily AI home suggestions';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      ALTER TABLE public.users
        ADD COLUMN ai_home_suggestion       jsonb,
        ADD COLUMN ai_home_suggestion_date  date;

      -- Index lets us quickly find/expire stale suggestions if we ever batch-refresh.
      CREATE INDEX users_ai_home_suggestion_date_idx
        ON public.users (ai_home_suggestion_date);
    `);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP INDEX IF EXISTS public.users_ai_home_suggestion_date_idx;
    ALTER TABLE public.users
      DROP COLUMN IF EXISTS ai_home_suggestion_date,
      DROP COLUMN IF EXISTS ai_home_suggestion;
  `).then(() => next(), next);
};
