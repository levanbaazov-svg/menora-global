'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'inspiration_bookmarks for Discover/Inspiration library';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- Bookmarks for content items defined in code (lib/inspiration/library.ts).
      -- The item itself isn't in the DB — only the user's save reference.
      CREATE TABLE public.inspiration_bookmarks (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        item_slug    text NOT NULL,
        item_kind    text NOT NULL,  -- 'parsha' | 'holiday' | 'wisdom' | 'story' | 'series'
        created_at   timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT inspiration_bookmarks_unique UNIQUE (user_id, item_slug)
      );

      CREATE INDEX inspiration_bookmarks_user_idx
        ON public.inspiration_bookmarks (user_id, created_at DESC);

      CREATE INDEX inspiration_bookmarks_kind_idx
        ON public.inspiration_bookmarks (user_id, item_kind);
    `);

    await trackAll(['inspiration_bookmarks']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TABLE IF EXISTS public.inspiration_bookmarks CASCADE;
  `).then(() => next(), next);
};
