'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'events, rsvps + attendee_count_cached trigger.';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── events ──────────────────────────────────────────────────────────
      CREATE TABLE public.events (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id          uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
        host_user_id          uuid NOT NULL REFERENCES public.users(id)       ON DELETE RESTRICT,

        title                 text NOT NULL,
        description           text,
        type                  event_type       NOT NULL DEFAULT 'other',
        visibility            event_visibility NOT NULL DEFAULT 'community',

        starts_at             timestamptz NOT NULL,
        ends_at               timestamptz,
        timezone              text,
        all_day               boolean NOT NULL DEFAULT false,

        location_text         text,
        location_address      text,
        location_visibility   location_visibility NOT NULL DEFAULT 'rsvp_only',

        max_attendees         integer,
        waitlist_enabled      boolean NOT NULL DEFAULT false,
        requires_approval     boolean NOT NULL DEFAULT false,

        cover_image_url       text,
        shabbat_meal_details  jsonb   NOT NULL DEFAULT '{}'::jsonb,
        tags                  text[]  NOT NULL DEFAULT '{}',

        status                event_status NOT NULL DEFAULT 'draft',
        attendee_count_cached integer      NOT NULL DEFAULT 0,

        published_at          timestamptz,
        cancelled_at          timestamptz,
        cancellation_reason   text,

        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT events_ends_after_starts CHECK (ends_at IS NULL OR ends_at >= starts_at)
      );
      CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX events_community_id_idx          ON public.events (community_id);
      CREATE INDEX events_host_user_id_idx          ON public.events (host_user_id);
      CREATE INDEX events_community_starts_at_idx   ON public.events (community_id, starts_at);
      CREATE INDEX events_community_status_idx      ON public.events (community_id, status);
      CREATE INDEX events_tags_idx                  ON public.events USING gin (tags);

      -- ── rsvps ───────────────────────────────────────────────────────────
      CREATE TABLE public.rsvps (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        user_id         uuid NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,

        status          rsvp_status NOT NULL DEFAULT 'yes',
        plus_ones       integer     NOT NULL DEFAULT 0,
        plus_ones_info  jsonb       NOT NULL DEFAULT '[]'::jsonb,

        dietary_notes   text,
        note_to_host    text,

        approved_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
        approved_at     timestamptz,
        declined_reason text,

        cancelled_at    timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT rsvps_event_user_unique UNIQUE (event_id, user_id),
        CONSTRAINT rsvps_plus_ones_nonneg  CHECK (plus_ones >= 0)
      );
      CREATE TRIGGER rsvps_set_updated_at BEFORE UPDATE ON public.rsvps
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX rsvps_event_id_idx      ON public.rsvps (event_id);
      CREATE INDEX rsvps_user_id_idx       ON public.rsvps (user_id);
      CREATE INDEX rsvps_event_status_idx  ON public.rsvps (event_id, status);

      -- ── attendee_count_cached trigger ───────────────────────────────────
      CREATE OR REPLACE FUNCTION public.recalc_event_attendee_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_event uuid;
      BEGIN
        target_event := COALESCE(NEW.event_id, OLD.event_id);
        UPDATE public.events SET attendee_count_cached = (
          SELECT COALESCE(SUM(1 + plus_ones), 0)
          FROM public.rsvps
          WHERE event_id = target_event AND status = 'yes'
        )
        WHERE id = target_event;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER rsvps_recalc_count
      AFTER INSERT OR UPDATE OR DELETE ON public.rsvps
      FOR EACH ROW EXECUTE FUNCTION public.recalc_event_attendee_count();
    `);
    await trackAll(['events', 'rsvps']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER  IF EXISTS rsvps_recalc_count ON public.rsvps;
    DROP FUNCTION IF EXISTS public.recalc_event_attendee_count();
    DROP TABLE    IF EXISTS public.rsvps  CASCADE;
    DROP TABLE    IF EXISTS public.events CASCADE;
  `).then(() => next(), next);
};
