'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'routines (per-user habits) + checkins (per-day completions).';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── routines ────────────────────────────────────────────────────────
      CREATE TABLE public.routines (
        id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        community_id            uuid REFERENCES public.communities(id) ON DELETE SET NULL,

        type                    routine_type NOT NULL,
        custom_label            text,

        target_time             time,
        timezone                text,
        days_of_week            integer[],

        enabled                 boolean NOT NULL DEFAULT true,
        reminder_offset_minutes integer NOT NULL DEFAULT 10,

        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT routines_custom_label_required
          CHECK (type <> 'custom' OR (custom_label IS NOT NULL AND length(trim(custom_label)) > 0))
      );
      CREATE TRIGGER routines_set_updated_at BEFORE UPDATE ON public.routines
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX routines_user_id_idx        ON public.routines (user_id);
      CREATE INDEX routines_user_enabled_idx   ON public.routines (user_id, enabled);

      -- ── checkins ────────────────────────────────────────────────────────
      CREATE TABLE public.checkins (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          uuid NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
        routine_id       uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,

        gregorian_date   date NOT NULL,
        hebrew_date_text text,

        completed_at     timestamptz NOT NULL DEFAULT now(),
        note             text,

        created_at       timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT checkins_user_routine_date_unique UNIQUE (user_id, routine_id, gregorian_date)
      );
      CREATE INDEX checkins_routine_id_idx        ON public.checkins (routine_id);
      CREATE INDEX checkins_user_date_idx         ON public.checkins (user_id, gregorian_date);
    `);
    await trackAll(['routines', 'checkins']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TABLE IF EXISTS public.checkins CASCADE;
    DROP TABLE IF EXISTS public.routines CASCADE;
  `).then(() => next(), next);
};
