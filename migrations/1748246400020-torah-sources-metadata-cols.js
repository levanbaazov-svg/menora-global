'use strict';

const { runSQL } = require('../scripts/hasura');

// The deployed torah_sources table predated the author/category/tags/authority
// columns in the create migration, so the ingest + RAG retrieval (which both
// reference these columns) failed silently. Add them idempotently.

exports.description = 'torah_sources: add author/category/tags/authority columns';

exports.up = (next) => {
  runSQL(`
    ALTER TABLE public.torah_sources ADD COLUMN IF NOT EXISTS author    text;
    ALTER TABLE public.torah_sources ADD COLUMN IF NOT EXISTS category  text;
    ALTER TABLE public.torah_sources ADD COLUMN IF NOT EXISTS tags      text[] NOT NULL DEFAULT '{}';
    ALTER TABLE public.torah_sources ADD COLUMN IF NOT EXISTS authority smallint NOT NULL DEFAULT 2;
  `).then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    ALTER TABLE public.torah_sources DROP COLUMN IF EXISTS author;
    ALTER TABLE public.torah_sources DROP COLUMN IF EXISTS category;
    ALTER TABLE public.torah_sources DROP COLUMN IF EXISTS tags;
    ALTER TABLE public.torah_sources DROP COLUMN IF EXISTS authority;
  `).then(() => next(), next);
};
