'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'add event_cancelled + event_updated to notification_type enum';

exports.up = (next) => {
  (async () => {
    // ALTER TYPE ... ADD VALUE can't run inside a transaction block, so issue
    // each separately. IF NOT EXISTS makes it idempotent.
    await runSQL(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_cancelled';`);
    await runSQL(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_updated';`);
  })().then(() => next(), next);
};

exports.down = (next) => {
  // Postgres can't drop enum values — no-op.
  next();
};
