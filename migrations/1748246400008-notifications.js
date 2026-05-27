'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'notifications table + per-recipient indexes';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      CREATE TYPE notification_type AS ENUM (
        'event_published',
        'event_cancelled',
        'event_rsvp_received',
        'request_replied',
        'request_reply_accepted',
        'request_fulfilled',
        'invitation_accepted',
        'membership_approved',
        'membership_rejected',
        'role_changed'
      );

      CREATE TABLE public.notifications (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        actor_user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
        community_id        uuid REFERENCES public.communities(id) ON DELETE CASCADE,
        type                notification_type NOT NULL,
        title               text NOT NULL,
        body                text,
        resource_type       text,
        resource_id         uuid,
        link                text,           -- relative URL to navigate on click
        metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
        read_at             timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX notifications_recipient_recent_idx
        ON public.notifications (recipient_user_id, created_at DESC);

      CREATE INDEX notifications_unread_idx
        ON public.notifications (recipient_user_id)
        WHERE read_at IS NULL;
    `);
    await trackAll(['notifications']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TABLE IF EXISTS public.notifications CASCADE;
    DROP TYPE  IF EXISTS notification_type;
  `).then(() => next(), next);
};
