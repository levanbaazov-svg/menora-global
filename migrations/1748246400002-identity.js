'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'communities, users, accounts (next-auth), user_profiles.';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── communities ─────────────────────────────────────────────────────
      CREATE TABLE public.communities (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug            citext NOT NULL UNIQUE,
        name            text   NOT NULL,
        city            text,
        country_code    text,
        timezone        text   NOT NULL DEFAULT 'UTC',
        hebrew_calendar jsonb  NOT NULL DEFAULT '{}'::jsonb,
        branding        jsonb  NOT NULL DEFAULT '{}'::jsonb,
        settings        jsonb  NOT NULL DEFAULT '{}'::jsonb,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER communities_set_updated_at BEFORE UPDATE ON public.communities
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      -- ── users (один на человека) ────────────────────────────────────────
      CREATE TABLE public.users (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email               citext NOT NULL UNIQUE,
        email_verified_at   timestamptz,
        name                text,
        image_url           text,
        locale              text   NOT NULL DEFAULT 'en',
        onboarding_step     onboarding_step NOT NULL DEFAULT 'signup',
        onboarded_at        timestamptz,
        tutorial_completed  boolean NOT NULL DEFAULT false,
        first_signup_path   signup_path,
        last_seen_at        timestamptz,
        deactivated_at      timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      CREATE INDEX users_last_seen_at_idx ON public.users (last_seen_at);

      -- ── accounts (next-auth Database Adapter) ───────────────────────────
      CREATE TABLE public.accounts (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        provider            text NOT NULL,
        provider_account_id text NOT NULL,
        type                text NOT NULL,
        access_token        text,
        refresh_token       text,
        id_token            text,
        expires_at          bigint,
        token_type          text,
        scope               text,
        session_state       text,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT accounts_provider_account_unique UNIQUE (provider, provider_account_id)
      );
      CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON public.accounts
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      CREATE INDEX accounts_user_id_idx ON public.accounts (user_id);

      -- ── user_profiles (1:1 с users) ─────────────────────────────────────
      CREATE TABLE public.user_profiles (
        user_id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

        legal_first_name   text,
        legal_last_name    text,
        hebrew_name        text,
        gender             gender_kind,
        date_of_birth      date,
        phone_e164         text,

        marital_status     marital_status_kind,
        has_children       boolean NOT NULL DEFAULT false,
        children_ages      integer[],
        spouse_hebrew_name text,

        denomination       denomination_kind,
        observance_level   observance_kind,
        kashrut_level      kashrut_kind,

        interests          text[] NOT NULL DEFAULT '{}',
        languages          text[] NOT NULL DEFAULT ARRAY['en']::text[],
        bio                text,

        profile_visibility visibility_kind NOT NULL DEFAULT 'community',
        notification_prefs jsonb NOT NULL DEFAULT
          '{"channels":["email","push"],"categories":["events","requests","prayers","community_news"]}'::jsonb,

        custom_fields      jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at         timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON public.user_profiles
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      CREATE INDEX user_profiles_phone_idx        ON public.user_profiles (phone_e164);
      CREATE INDEX user_profiles_denomination_idx ON public.user_profiles (denomination);
      CREATE INDEX user_profiles_interests_idx    ON public.user_profiles USING gin (interests);
    `);
    await trackAll(['communities', 'users', 'accounts', 'user_profiles']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TABLE IF EXISTS public.user_profiles CASCADE;
    DROP TABLE IF EXISTS public.accounts      CASCADE;
    DROP TABLE IF EXISTS public.users         CASCADE;
    DROP TABLE IF EXISTS public.communities   CASCADE;
  `).then(() => next(), next);
};
