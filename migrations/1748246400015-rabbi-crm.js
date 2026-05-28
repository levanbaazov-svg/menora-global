'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'rabbi_tasks + member_notes + ical_subscription_token (Phase I CRM)';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      CREATE TYPE rabbi_task_status AS ENUM ('open', 'done', 'cancelled');

      -- ── member_notes ────────────────────────────────────────────────────
      -- Rabbi's private notes about a community member. NEVER visible to the
      -- member themselves — only to community rabbi/admin.
      CREATE TABLE public.member_notes (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
        member_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        author_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
        body            text NOT NULL,
        source          text,  -- e.g. 'voice', 'manual', 'ai_assistant'

        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER member_notes_set_updated_at BEFORE UPDATE ON public.member_notes
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX member_notes_member_idx
        ON public.member_notes (community_id, member_user_id, created_at DESC);

      -- ── rabbi_tasks ────────────────────────────────────────────────────
      -- Tasks created by rabbi/admin. Can be tied (optionally) to a specific
      -- member, event, or program.
      CREATE TABLE public.rabbi_tasks (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
        created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
        assigned_to_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
                                -- nullable: defaults to creator
        title           text NOT NULL,
        body            text,
        due_date        date,
        due_at          timestamptz,  -- nullable: date-only OR time-specific
        status          rabbi_task_status NOT NULL DEFAULT 'open',
        priority        smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
                                -- 1 = low, 2 = normal, 3 = high

        -- Optional relations
        related_member_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
        related_event_id  uuid REFERENCES public.events(id) ON DELETE SET NULL,
        related_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,

        completed_at    timestamptz,
        completed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
        source          text,  -- 'voice', 'manual', 'ai_assistant'

        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER rabbi_tasks_set_updated_at BEFORE UPDATE ON public.rabbi_tasks
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX rabbi_tasks_open_idx
        ON public.rabbi_tasks (community_id, due_date NULLS LAST)
        WHERE status = 'open';
      CREATE INDEX rabbi_tasks_assignee_idx
        ON public.rabbi_tasks (assigned_to_user_id, status, due_date NULLS LAST);
      CREATE INDEX rabbi_tasks_member_idx
        ON public.rabbi_tasks (related_member_user_id)
        WHERE related_member_user_id IS NOT NULL;

      -- ── ical_subscription_token on users ─────────────────────────────────
      -- Stable token so a user can subscribe their external calendar to a
      -- Menorah ICS feed of their tasks/events. Separate from jewish_id_token.
      ALTER TABLE public.users
        ADD COLUMN ical_subscription_token uuid NOT NULL DEFAULT gen_random_uuid();
      CREATE UNIQUE INDEX users_ical_subscription_token_idx
        ON public.users (ical_subscription_token);
    `);

    await trackAll(['member_notes', 'rabbi_tasks']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP INDEX IF EXISTS public.users_ical_subscription_token_idx;
    ALTER TABLE public.users DROP COLUMN IF EXISTS ical_subscription_token;
    DROP TABLE IF EXISTS public.rabbi_tasks CASCADE;
    DROP TABLE IF EXISTS public.member_notes CASCADE;
    DROP TYPE IF EXISTS rabbi_task_status;
  `).then(() => next(), next);
};
