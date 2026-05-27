'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'Extensions, set_updated_at() trigger function, and all 21 enum types.';

exports.up = (next) => {
  runSQL(`
    CREATE EXTENSION IF NOT EXISTS citext;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    -- Identity / membership
    CREATE TYPE membership_role   AS ENUM ('member','rabbi','admin');
    CREATE TYPE membership_status AS ENUM ('pending','active','suspended','rejected','left');
    CREATE TYPE entry_method      AS ENUM ('invite','self_request','rabbi_added');
    CREATE TYPE signup_path       AS ENUM ('invite','self');
    CREATE TYPE onboarding_step   AS ENUM (
      'signup','identity','family','religious',
      'interests','community_choice','privacy','tutorial','done'
    );

    -- User profile demographics
    CREATE TYPE gender_kind         AS ENUM ('male','female','other','prefer_not_say');
    CREATE TYPE marital_status_kind AS ENUM ('single','engaged','married','divorced','widowed');
    CREATE TYPE denomination_kind   AS ENUM (
      'reform','conservative','modern_orthodox','orthodox',
      'chabad','sephardi','reconstructionist','secular','other'
    );
    CREATE TYPE observance_kind AS ENUM ('curious','traditional','observant','strictly_observant');
    CREATE TYPE kashrut_kind    AS ENUM ('none','basic','strict','mehadrin');
    CREATE TYPE visibility_kind AS ENUM ('community','members_only','private');

    -- Events
    CREATE TYPE event_type AS ENUM (
      'shabbat_dinner','shabbat_lunch','holiday_meal','lecture',
      'minyan','learning','social','volunteer','kids','other'
    );
    CREATE TYPE event_visibility    AS ENUM ('community','members_invited','public_in_app');
    CREATE TYPE location_visibility AS ENUM ('everyone','rsvp_only','host_only');
    CREATE TYPE event_status        AS ENUM ('draft','published','cancelled');
    CREATE TYPE rsvp_status         AS ENUM ('yes','maybe','no','waitlist','cancelled');

    -- Requests board
    CREATE TYPE request_category AS ENUM (
      'childcare','services','learning','community',
      'loan','housing','meals','other'
    );
    CREATE TYPE request_urgency       AS ENUM ('low','normal','high');
    CREATE TYPE request_status        AS ENUM ('open','in_progress','fulfilled','expired','cancelled');
    CREATE TYPE reply_contact_method  AS ENUM ('public_thread','share_phone','share_email');

    -- Routines
    CREATE TYPE routine_type AS ENUM (
      'modeh_ani','shacharit','mincha','maariv',
      'shema_al_hamita','tehilim','torah_learning','custom'
    );
  `).then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TYPE IF EXISTS routine_type;
    DROP TYPE IF EXISTS reply_contact_method;
    DROP TYPE IF EXISTS request_status;
    DROP TYPE IF EXISTS request_urgency;
    DROP TYPE IF EXISTS request_category;
    DROP TYPE IF EXISTS rsvp_status;
    DROP TYPE IF EXISTS event_status;
    DROP TYPE IF EXISTS location_visibility;
    DROP TYPE IF EXISTS event_visibility;
    DROP TYPE IF EXISTS event_type;
    DROP TYPE IF EXISTS visibility_kind;
    DROP TYPE IF EXISTS kashrut_kind;
    DROP TYPE IF EXISTS observance_kind;
    DROP TYPE IF EXISTS denomination_kind;
    DROP TYPE IF EXISTS marital_status_kind;
    DROP TYPE IF EXISTS gender_kind;
    DROP TYPE IF EXISTS onboarding_step;
    DROP TYPE IF EXISTS signup_path;
    DROP TYPE IF EXISTS entry_method;
    DROP TYPE IF EXISTS membership_status;
    DROP TYPE IF EXISTS membership_role;
    DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
  `).then(() => next(), next);
};
