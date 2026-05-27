'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'ai_conversations + ai_messages for AI Rabbi chat';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      CREATE TYPE ai_scenario AS ENUM (
        'purpose',        -- Найти себя
        'shabbat',        -- Спланировать шаббат
        'hebrew_school',  -- Школа для детей
        'parsha',         -- Парша недели
        'meet_people',    -- Найти своих
        'struggling',     -- Мне тяжело
        'open'            -- Свободный разговор
      );

      CREATE TYPE ai_message_role AS ENUM ('system', 'user', 'assistant');

      -- ── ai_conversations ───────────────────────────────────────────────
      CREATE TABLE public.ai_conversations (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        community_id        uuid REFERENCES public.communities(id) ON DELETE SET NULL,
        scenario            ai_scenario NOT NULL DEFAULT 'open',
        title               text,                 -- auto-generated from first message, editable later
        last_message_at     timestamptz,
        message_count       integer NOT NULL DEFAULT 0,
        total_tokens_input  integer NOT NULL DEFAULT 0,
        total_tokens_output integer NOT NULL DEFAULT 0,

        archived_at         timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE TRIGGER ai_conversations_set_updated_at BEFORE UPDATE ON public.ai_conversations
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

      CREATE INDEX ai_conversations_user_idx ON public.ai_conversations (user_id, last_message_at DESC NULLS LAST)
        WHERE archived_at IS NULL;
      CREATE INDEX ai_conversations_scenario_idx ON public.ai_conversations (user_id, scenario, last_message_at DESC NULLS LAST)
        WHERE archived_at IS NULL;

      -- ── ai_messages ────────────────────────────────────────────────────
      CREATE TABLE public.ai_messages (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
        role            ai_message_role NOT NULL,
        content         text NOT NULL,
        tokens_input    integer,
        tokens_output   integer,
        model           text,
        created_at      timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX ai_messages_conversation_idx ON public.ai_messages (conversation_id, created_at);

      -- ── Trigger: keep ai_conversations counters fresh ───────────────────
      CREATE OR REPLACE FUNCTION public.recalc_ai_conversation_stats()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_conv uuid;
      BEGIN
        target_conv := COALESCE(NEW.conversation_id, OLD.conversation_id);
        UPDATE public.ai_conversations SET
          message_count = (
            SELECT COUNT(*) FROM public.ai_messages
            WHERE conversation_id = target_conv AND role <> 'system'
          ),
          total_tokens_input = COALESCE((
            SELECT SUM(tokens_input) FROM public.ai_messages
            WHERE conversation_id = target_conv
          ), 0),
          total_tokens_output = COALESCE((
            SELECT SUM(tokens_output) FROM public.ai_messages
            WHERE conversation_id = target_conv
          ), 0),
          last_message_at = (
            SELECT MAX(created_at) FROM public.ai_messages
            WHERE conversation_id = target_conv
          )
        WHERE id = target_conv;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER ai_messages_recalc_stats
      AFTER INSERT OR UPDATE OR DELETE ON public.ai_messages
      FOR EACH ROW EXECUTE FUNCTION public.recalc_ai_conversation_stats();
    `);

    await trackAll(['ai_conversations', 'ai_messages']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER IF EXISTS ai_messages_recalc_stats ON public.ai_messages;
    DROP FUNCTION IF EXISTS public.recalc_ai_conversation_stats();
    DROP TABLE IF EXISTS public.ai_messages CASCADE;
    DROP TABLE IF EXISTS public.ai_conversations CASCADE;
    DROP TYPE IF EXISTS ai_message_role;
    DROP TYPE IF EXISTS ai_scenario;
  `).then(() => next(), next);
};
