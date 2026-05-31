'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'event price fields (is_free, price_amount, price_currency)';

exports.up = (next) => {
  runSQL(`
    ALTER TABLE public.events
      ADD COLUMN is_free        boolean NOT NULL DEFAULT true,
      ADD COLUMN price_amount   numeric(10,2),
      ADD COLUMN price_currency text;
  `).then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    ALTER TABLE public.events
      DROP COLUMN IF EXISTS is_free,
      DROP COLUMN IF EXISTS price_amount,
      DROP COLUMN IF EXISTS price_currency;
  `).then(() => next(), next);
};
