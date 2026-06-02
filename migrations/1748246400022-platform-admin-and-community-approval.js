'use strict';

const { runSQL } = require('../scripts/hasura');

// Platform super-admin flag (the Menorah team) + community moderation status.
// New communities created in-app start as 'pending' (hidden) until a platform
// admin approves; existing communities default to 'approved'.

exports.description = 'users.is_platform_admin + communities.approval_status';

exports.up = (next) => {
  runSQL(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;
    ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
  `).then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    ALTER TABLE public.users DROP COLUMN IF EXISTS is_platform_admin;
    ALTER TABLE public.communities DROP COLUMN IF EXISTS approval_status;
  `).then(() => next(), next);
};
