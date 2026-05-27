'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'requests + request_replies (back-link FK + reply_count_cached trigger).';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      -- ── requests ────────────────────────────────────────────────────────
      CREATE TABLE public.requests (
        id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id       uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
        user_id            uuid NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,

        category           request_category NOT NULL DEFAULT 'other',
        urgency            request_urgency  NOT NULL DEFAULT 'normal',

        title              text NOT NULL,
        body               text NOT NULL,

        status             request_status NOT NULL DEFAULT 'open',

        accepted_reply_id  uuid,                              -- FK добавим ниже

        expires_at         timestamptz,
        fulfilled_at       timestamptz,
        cancelled_at       timestamptz,
        reply_count_cached integer NOT NULL DEFAULT 0,

        created_at         timestamptz NOT NULL DEFAULT now(),
        updated_at         timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER requests_set_updated_at BEFORE UPDATE ON public.requests
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX requests_community_id_idx        ON public.requests (community_id);
      CREATE INDEX requests_user_id_idx             ON public.requests (user_id);
      CREATE INDEX requests_community_status_idx    ON public.requests (community_id, status);
      CREATE INDEX requests_community_category_idx  ON public.requests (community_id, category);

      -- ── request_replies ─────────────────────────────────────────────────
      CREATE TABLE public.request_replies (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id     uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
        user_id        uuid NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,

        body           text NOT NULL,
        contact_method reply_contact_method NOT NULL DEFAULT 'public_thread',
        contact_phone  text,
        contact_email  citext,

        withdrawn_at   timestamptz,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      );
      CREATE TRIGGER request_replies_set_updated_at BEFORE UPDATE ON public.request_replies
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX request_replies_request_id_idx ON public.request_replies (request_id);
      CREATE INDEX request_replies_user_id_idx    ON public.request_replies (user_id);

      -- ── back-link FK requests.accepted_reply_id → request_replies ──────
      ALTER TABLE public.requests
        ADD CONSTRAINT requests_accepted_reply_fk
        FOREIGN KEY (accepted_reply_id) REFERENCES public.request_replies(id) ON DELETE SET NULL;

      -- ── reply_count_cached trigger ──────────────────────────────────────
      CREATE OR REPLACE FUNCTION public.recalc_request_reply_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_request uuid;
      BEGIN
        target_request := COALESCE(NEW.request_id, OLD.request_id);
        UPDATE public.requests SET reply_count_cached = (
          SELECT COUNT(*) FROM public.request_replies
          WHERE request_id = target_request AND withdrawn_at IS NULL
        )
        WHERE id = target_request;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER request_replies_recalc_count
      AFTER INSERT OR UPDATE OR DELETE ON public.request_replies
      FOR EACH ROW EXECUTE FUNCTION public.recalc_request_reply_count();
    `);
    await trackAll(['requests', 'request_replies']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER  IF EXISTS request_replies_recalc_count ON public.request_replies;
    DROP FUNCTION IF EXISTS public.recalc_request_reply_count();
    ALTER TABLE   IF EXISTS public.requests DROP CONSTRAINT IF EXISTS requests_accepted_reply_fk;
    DROP TABLE    IF EXISTS public.request_replies CASCADE;
    DROP TABLE    IF EXISTS public.requests        CASCADE;
  `).then(() => next(), next);
};
