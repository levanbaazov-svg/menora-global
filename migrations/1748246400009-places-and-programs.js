'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'places (Jewish life city-guide) + programs + program_enrollments';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── Enums ────────────────────────────────────────────────────────────
      CREATE TYPE place_type AS ENUM (
        'synagogue',
        'restaurant',
        'cafe',
        'store',
        'mikvah',
        'school',
        'service',
        'jcc',
        'museum',
        'cemetery'
      );

      CREATE TYPE kashrut_level AS ENUM (
        'none',         -- no kashrut (e.g. synagogue, mikvah)
        'basic',        -- self-declared, no certification
        'standard',     -- standard hechsher
        'mehadrin',     -- mehadrin
        'glatt'         -- glatt mehadrin
      );

      CREATE TYPE price_level AS ENUM ('$', '$$', '$$$', '$$$$');

      CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

      CREATE TYPE program_category AS ENUM (
        'kids',
        'teens',
        'young_adult',
        'couples',
        'families',
        'newcomers',
        'adults',
        'seniors',
        'women',
        'men'
      );

      CREATE TYPE program_status AS ENUM ('draft', 'active', 'paused', 'archived');

      CREATE TYPE price_period AS ENUM ('one_time', 'monthly', 'yearly', 'per_session');

      CREATE TYPE enrollment_status AS ENUM (
        'pending', 'active', 'waitlist', 'completed', 'cancelled', 'rejected'
      );

      -- ── places ───────────────────────────────────────────────────────────
      CREATE TABLE public.places (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id        uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,

        type                place_type NOT NULL,
        name                text NOT NULL,
        description         text,
        photo_url           text,

        -- Address & geo
        address             text,
        city                text,
        country_code        text,
        neighborhood        text,
        latitude            double precision,
        longitude           double precision,
        timezone            text,

        -- Hours: jsonb with shape { mon: { open: "09:00", close: "22:00" }, ... }
        -- Use "closed": true for closed days, null for "by appointment".
        hours_schedule      jsonb NOT NULL DEFAULT '{}'::jsonb,
        hours_notes         text,                  -- "Closed shabbat", "By appointment"

        -- Contact
        contact_phone       text,
        contact_email       citext,
        website_url         text,
        reservation_url     text,                  -- external booking link

        -- Food-specific
        kashrut_level       kashrut_level,
        kashrut_authority   text,                  -- "OU", "Star-K", "Crown Heights"
        price_level         price_level,
        cuisine_tags        text[] NOT NULL DEFAULT '{}',  -- ["israeli", "ashkenazi", "sephardi"]
        dietary_tags        text[] NOT NULL DEFAULT '{}',  -- ["vegan", "gluten_free", "dairy"]

        -- Synagogue-specific
        has_women_section   boolean,
        has_parking_shabbat boolean,
        prayer_times_url    text,
        denomination        denomination_kind,     -- reuse existing enum

        -- General flags
        accepts_reservations boolean NOT NULL DEFAULT false,
        wheelchair_accessible boolean,
        family_friendly     boolean,

        -- Crowd-sourcing
        submitted_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
        submission_status   submission_status NOT NULL DEFAULT 'approved',
        approved_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
        approved_at         timestamptz,
        rejection_reason    text,

        -- Tags for filter/search
        tags                text[] NOT NULL DEFAULT '{}',

        archived_at         timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER places_set_updated_at BEFORE UPDATE ON public.places
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX places_community_type_idx ON public.places (community_id, type)
        WHERE submission_status = 'approved' AND archived_at IS NULL;
      CREATE INDEX places_kashrut_idx ON public.places (kashrut_level)
        WHERE kashrut_level IS NOT NULL;
      CREATE INDEX places_geo_idx ON public.places (latitude, longitude)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
      CREATE INDEX places_tags_gin ON public.places USING gin (tags);
      CREATE INDEX places_name_trgm ON public.places USING gin (name gin_trgm_ops);
      CREATE INDEX places_pending_idx ON public.places (community_id, submitted_by)
        WHERE submission_status = 'pending';

      -- ── programs ─────────────────────────────────────────────────────────
      CREATE TABLE public.programs (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id        uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,

        category            program_category NOT NULL,
        name                text NOT NULL,
        description         text,
        photo_url           text,

        -- Schedule (free + structured)
        schedule_text       text,                  -- "Sundays 10am-1pm"
        schedule_recurrence jsonb NOT NULL DEFAULT '{}'::jsonb,
        starts_on           date,
        ends_on             date,
        timezone            text,

        -- Audience
        age_min             integer,
        age_max             integer,

        -- Pricing
        price_amount        numeric(10, 2),
        price_currency      text DEFAULT 'USD',
        price_period        price_period,
        price_notes         text,                  -- "Scholarships available"

        -- Capacity & registration
        max_capacity        integer,
        enrolled_count_cached integer NOT NULL DEFAULT 0,
        registration_url    text,                  -- external link OR null = in-app
        registration_open   boolean NOT NULL DEFAULT true,
        requires_approval   boolean NOT NULL DEFAULT false,

        -- Coordination
        contact_user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
        location_place_id   uuid REFERENCES public.places(id) ON DELETE SET NULL,
        location_text       text,

        tags                text[] NOT NULL DEFAULT '{}',
        status              program_status NOT NULL DEFAULT 'active',

        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER programs_set_updated_at BEFORE UPDATE ON public.programs
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX programs_community_category_idx ON public.programs (community_id, category)
        WHERE status = 'active';
      CREATE INDEX programs_age_range_idx ON public.programs (age_min, age_max);
      CREATE INDEX programs_tags_gin ON public.programs USING gin (tags);

      -- ── program_enrollments ──────────────────────────────────────────────
      CREATE TABLE public.program_enrollments (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id          uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
        user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

        -- For child enrollments (parent registers child)
        is_for_child        boolean NOT NULL DEFAULT false,
        child_first_name    text,
        child_last_name     text,
        child_dob           date,
        child_gender        gender_kind,

        notes               text,                  -- "Vegetarian", "Allergic to nuts"
        custom_fields       jsonb NOT NULL DEFAULT '{}'::jsonb,

        status              enrollment_status NOT NULL DEFAULT 'pending',
        approved_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
        approved_at         timestamptz,
        rejected_at         timestamptz,
        rejected_reason     text,

        enrolled_at         timestamptz NOT NULL DEFAULT now(),
        cancelled_at        timestamptz,

        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER program_enrollments_set_updated_at BEFORE UPDATE ON public.program_enrollments
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      -- One active enrollment per (user, program) for non-child rows.
      -- Multiple child enrollments per parent allowed (one per child).
      CREATE UNIQUE INDEX program_enrollments_user_program_unique_idx
        ON public.program_enrollments (program_id, user_id)
        WHERE is_for_child = false AND status IN ('pending', 'active', 'waitlist');

      CREATE INDEX program_enrollments_program_idx ON public.program_enrollments (program_id);
      CREATE INDEX program_enrollments_user_idx ON public.program_enrollments (user_id);

      -- ── Trigger: keep programs.enrolled_count_cached fresh ──────────────
      CREATE OR REPLACE FUNCTION public.recalc_program_enrollment_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_program uuid;
      BEGIN
        target_program := COALESCE(NEW.program_id, OLD.program_id);
        UPDATE public.programs SET enrolled_count_cached = (
          SELECT COUNT(*) FROM public.program_enrollments
          WHERE program_id = target_program AND status = 'active'
        )
        WHERE id = target_program;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER program_enrollments_recalc_count
      AFTER INSERT OR UPDATE OR DELETE ON public.program_enrollments
      FOR EACH ROW EXECUTE FUNCTION public.recalc_program_enrollment_count();
    `);

    await trackAll(['places', 'programs', 'program_enrollments']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER IF EXISTS program_enrollments_recalc_count ON public.program_enrollments;
    DROP FUNCTION IF EXISTS public.recalc_program_enrollment_count();
    DROP TABLE IF EXISTS public.program_enrollments CASCADE;
    DROP TABLE IF EXISTS public.programs CASCADE;
    DROP TABLE IF EXISTS public.places CASCADE;
    DROP TYPE IF EXISTS enrollment_status;
    DROP TYPE IF EXISTS price_period;
    DROP TYPE IF EXISTS program_status;
    DROP TYPE IF EXISTS program_category;
    DROP TYPE IF EXISTS submission_status;
    DROP TYPE IF EXISTS price_level;
    DROP TYPE IF EXISTS kashrut_level;
    DROP TYPE IF EXISTS place_type;
  `).then(() => next(), next);
};
