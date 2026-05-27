'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'interest_groups + group_memberships (chat deferred to v1.1)';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      CREATE TYPE group_visibility AS ENUM (
        'public',       -- anyone in any community can join
        'community',    -- only own community members
        'invite_only'   -- creator/admins invite
      );

      CREATE TYPE group_member_role AS ENUM ('member', 'admin');

      -- ── interest_groups ─────────────────────────────────────────────────
      CREATE TABLE public.interest_groups (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id        uuid REFERENCES public.communities(id) ON DELETE CASCADE,
        -- nullable community_id = global group, joinable from anywhere

        category            text NOT NULL,
        name                text NOT NULL,
        description         text,
        photo_url           text,

        visibility          group_visibility NOT NULL DEFAULT 'community',
        frequency           text,                  -- "Weekly", "Bi-weekly", free text
        meeting_location    text,                  -- free text or place name
        meeting_place_id    uuid REFERENCES public.places(id) ON DELETE SET NULL,

        created_by_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,
        member_count_cached integer NOT NULL DEFAULT 0,
        is_ai_suggested     boolean NOT NULL DEFAULT false,

        tags                text[] NOT NULL DEFAULT '{}',

        archived_at         timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER interest_groups_set_updated_at BEFORE UPDATE ON public.interest_groups
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX interest_groups_community_idx ON public.interest_groups (community_id)
        WHERE archived_at IS NULL;
      CREATE INDEX interest_groups_category_idx ON public.interest_groups (category)
        WHERE archived_at IS NULL;
      CREATE INDEX interest_groups_tags_gin ON public.interest_groups USING gin (tags);

      -- ── group_memberships ────────────────────────────────────────────────
      CREATE TABLE public.group_memberships (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id        uuid NOT NULL REFERENCES public.interest_groups(id) ON DELETE CASCADE,
        user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        role            group_member_role NOT NULL DEFAULT 'member',
        joined_at       timestamptz NOT NULL DEFAULT now(),
        left_at         timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT group_memberships_unique UNIQUE (group_id, user_id)
      );

      CREATE TRIGGER group_memberships_set_updated_at BEFORE UPDATE ON public.group_memberships
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX group_memberships_user_idx ON public.group_memberships (user_id)
        WHERE left_at IS NULL;
      CREATE INDEX group_memberships_group_idx ON public.group_memberships (group_id)
        WHERE left_at IS NULL;

      -- ── Trigger: keep interest_groups.member_count_cached fresh ─────────
      CREATE OR REPLACE FUNCTION public.recalc_group_member_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_group uuid;
      BEGIN
        target_group := COALESCE(NEW.group_id, OLD.group_id);
        UPDATE public.interest_groups SET member_count_cached = (
          SELECT COUNT(*) FROM public.group_memberships
          WHERE group_id = target_group AND left_at IS NULL
        )
        WHERE id = target_group;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER group_memberships_recalc_count
      AFTER INSERT OR UPDATE OR DELETE ON public.group_memberships
      FOR EACH ROW EXECUTE FUNCTION public.recalc_group_member_count();

      -- Creator becomes admin automatically (DB trigger keeps invariant true).
      CREATE OR REPLACE FUNCTION public.create_group_admin_membership()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.created_by_user_id IS NOT NULL THEN
          INSERT INTO public.group_memberships (group_id, user_id, role)
          VALUES (NEW.id, NEW.created_by_user_id, 'admin')
          ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER interest_groups_auto_admin
      AFTER INSERT ON public.interest_groups
      FOR EACH ROW EXECUTE FUNCTION public.create_group_admin_membership();
    `);

    await trackAll(['interest_groups', 'group_memberships']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER IF EXISTS interest_groups_auto_admin ON public.interest_groups;
    DROP TRIGGER IF EXISTS group_memberships_recalc_count ON public.group_memberships;
    DROP FUNCTION IF EXISTS public.create_group_admin_membership();
    DROP FUNCTION IF EXISTS public.recalc_group_member_count();
    DROP TABLE IF EXISTS public.group_memberships CASCADE;
    DROP TABLE IF EXISTS public.interest_groups CASCADE;
    DROP TYPE IF EXISTS group_member_role;
    DROP TYPE IF EXISTS group_visibility;
  `).then(() => next(), next);
};
