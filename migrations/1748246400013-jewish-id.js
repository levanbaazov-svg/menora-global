'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'jewish_id_token + jewish_id_enabled on users for QR card';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      ALTER TABLE public.users
        ADD COLUMN jewish_id_token uuid NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN jewish_id_enabled boolean NOT NULL DEFAULT true,
        ADD COLUMN jewish_id_regenerated_at timestamptz;

      CREATE UNIQUE INDEX users_jewish_id_token_idx
        ON public.users (jewish_id_token);
    `);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP INDEX IF EXISTS public.users_jewish_id_token_idx;
    ALTER TABLE public.users
      DROP COLUMN IF EXISTS jewish_id_regenerated_at,
      DROP COLUMN IF EXISTS jewish_id_enabled,
      DROP COLUMN IF EXISTS jewish_id_token;
  `).then(() => next(), next);
};
