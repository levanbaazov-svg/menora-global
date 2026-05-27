'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'Финальные индексы: partial + trigram для поиска/фида.';

exports.up = (next) => {
  runSQL(`
    -- Фид событий: «published в общине, отсортировать по starts_at»
    CREATE INDEX events_published_starts_at_idx
      ON public.events (community_id, starts_at)
      WHERE status = 'published';

    -- Открытые requests, не истёкшие
    CREATE INDEX requests_open_recent_idx
      ON public.requests (community_id, created_at)
      WHERE status = 'open';

    -- Full-text-search через trgm (полноценный tsvector — в v1.1)
    CREATE INDEX events_title_trgm_idx   ON public.events   USING gin (title gin_trgm_ops);
    CREATE INDEX requests_title_trgm_idx ON public.requests USING gin (title gin_trgm_ops);

    -- Поиск users по имени (rabbi/admin сценарии)
    CREATE INDEX user_profiles_last_name_idx   ON public.user_profiles (legal_last_name);
    CREATE INDEX user_profiles_hebrew_name_idx ON public.user_profiles (hebrew_name);

    -- Активные membership в общине (часто для агрегатов)
    CREATE INDEX memberships_active_community_idx
      ON public.memberships (community_id)
      WHERE status = 'active';

    -- Streak query: «последние N checkins пользователя по рутине»
    CREATE INDEX checkins_routine_date_desc_idx
      ON public.checkins (routine_id, gregorian_date);

    -- Pending memberships (rabbi dashboard)
    CREATE INDEX memberships_pending_idx
      ON public.memberships (community_id, created_at)
      WHERE status = 'pending';
  `).then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP INDEX IF EXISTS public.memberships_pending_idx;
    DROP INDEX IF EXISTS public.checkins_routine_date_desc_idx;
    DROP INDEX IF EXISTS public.memberships_active_community_idx;
    DROP INDEX IF EXISTS public.user_profiles_hebrew_name_idx;
    DROP INDEX IF EXISTS public.user_profiles_last_name_idx;
    DROP INDEX IF EXISTS public.requests_title_trgm_idx;
    DROP INDEX IF EXISTS public.events_title_trgm_idx;
    DROP INDEX IF EXISTS public.requests_open_recent_idx;
    DROP INDEX IF EXISTS public.events_published_starts_at_idx;
  `).then(() => next(), next);
};
