'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'memberships, invitations, audit_log — RLS-ключевая часть.';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── memberships ─────────────────────────────────────────────────────
      CREATE TABLE public.memberships (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
        community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,

        role            membership_role   NOT NULL DEFAULT 'member',
        status          membership_status NOT NULL DEFAULT 'pending',
        entry_method    entry_method      NOT NULL,

        request_message text,

        invited_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
        approved_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
        rejected_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,

        community_role  text,
        member_since    date,
        family_id       uuid,
        prayer_config   jsonb   NOT NULL DEFAULT '{}'::jsonb,
        onboarding_done boolean NOT NULL DEFAULT false,

        joined_at       timestamptz,
        rejected_at     timestamptz,
        rejected_reason text,
        suspended_at    timestamptz,
        left_at         timestamptz,

        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT memberships_user_community_unique UNIQUE (user_id, community_id)
      );
      CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON public.memberships
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX memberships_community_id_idx       ON public.memberships (community_id);
      CREATE INDEX memberships_user_id_idx            ON public.memberships (user_id);
      CREATE INDEX memberships_community_status_idx   ON public.memberships (community_id, status);
      CREATE INDEX memberships_family_id_idx          ON public.memberships (family_id)
        WHERE family_id IS NOT NULL;

      -- ── invitations ─────────────────────────────────────────────────────
      CREATE TABLE public.invitations (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
        email        citext NOT NULL,
        role         membership_role NOT NULL DEFAULT 'member',

        token_hash   text NOT NULL UNIQUE,

        invited_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
        message      text,

        expires_at   timestamptz NOT NULL,
        accepted_at  timestamptz,
        accepted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
        revoked_at   timestamptz,
        revoked_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,

        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER invitations_set_updated_at BEFORE UPDATE ON public.invitations
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX invitations_community_email_idx ON public.invitations (community_id, email);
      CREATE INDEX invitations_expires_at_idx      ON public.invitations (expires_at);

      -- ── audit_log ───────────────────────────────────────────────────────
      CREATE TABLE public.audit_log (
        id             bigserial PRIMARY KEY,
        actor_user_id  uuid REFERENCES public.users(id)       ON DELETE SET NULL,
        community_id   uuid REFERENCES public.communities(id) ON DELETE SET NULL,
        action         text  NOT NULL,
        resource_type  text,
        resource_id    uuid,
        metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
        ip             inet,
        user_agent     text,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX audit_log_community_id_idx  ON public.audit_log (community_id);
      CREATE INDEX audit_log_actor_user_id_idx ON public.audit_log (actor_user_id);
      CREATE INDEX audit_log_action_idx        ON public.audit_log (action);
      CREATE INDEX audit_log_created_at_idx    ON public.audit_log (created_at);
    `);
    await trackAll(['memberships', 'invitations', 'audit_log']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TABLE IF EXISTS public.audit_log   CASCADE;
    DROP TABLE IF EXISTS public.invitations CASCADE;
    DROP TABLE IF EXISTS public.memberships CASCADE;
  `).then(() => next(), next);
};
