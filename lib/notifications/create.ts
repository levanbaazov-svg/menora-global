// Server-only notification creation helpers. Called inline from server
// actions (RSVP, reply, approval) — no event-trigger plumbing required.

import 'server-only';
import { hasuraAdmin } from '@/lib/hasura';

const INSERT = /* GraphQL */ `
  mutation InsertNotifications($objs: [notifications_insert_input!]!) {
    insert_notifications(objects: $objs) { affected_rows }
  }
`;

export type NotificationType =
  | 'event_published'
  | 'event_cancelled'
  | 'event_rsvp_received'
  | 'request_replied'
  | 'request_reply_accepted'
  | 'request_fulfilled'
  | 'invitation_accepted'
  | 'membership_approved'
  | 'membership_rejected'
  | 'role_changed';

export interface NotificationInput {
  recipient_user_id: string;
  actor_user_id?: string | null;
  community_id?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Create one or more notifications. Best-effort — failure is logged but doesn't
 * break the caller (a missed notification is better than a failed action).
 */
export async function notify(input: NotificationInput | NotificationInput[]): Promise<void> {
  const arr = Array.isArray(input) ? input : [input];
  if (arr.length === 0) return;
  try {
    await hasuraAdmin.request(INSERT, {
      objs: arr.map((n) => ({
        recipient_user_id: n.recipient_user_id,
        actor_user_id: n.actor_user_id ?? null,
        community_id: n.community_id ?? null,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        resource_type: n.resource_type ?? null,
        resource_id: n.resource_id ?? null,
        link: n.link ?? null,
        metadata: n.metadata ?? {},
      })),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('notify() failed:', e instanceof Error ? e.message : e);
  }
}
