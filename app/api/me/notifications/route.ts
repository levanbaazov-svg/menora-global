// GET  /api/me/notifications        → { count, recent: [...] }  (last 10 + unread count)
// POST /api/me/notifications/read   → mark notifications read by ids

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';

const FETCH = /* GraphQL */ `
  query NotificationsPanel($user_id: uuid!) {
    unread: notifications_aggregate(where: {
      recipient_user_id: { _eq: $user_id }
      read_at: { _is_null: true }
    }) { aggregate { count } }

    recent: notifications(
      where: { recipient_user_id: { _eq: $user_id } }
      order_by: { created_at: desc }
      limit: 12
    ) {
      id type title body link read_at created_at
      actor { id name image_url }
    }
  }
`;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0, recent: [] });
  }
  const data = await hasuraAdmin.request<{
    unread: { aggregate: { count: number } | null };
    recent: Array<{
      id: string; type: string; title: string; body: string | null; link: string | null;
      read_at: string | null; created_at: string;
      actor: { id: string; name: string | null; image_url: string | null } | null;
    }>;
  }>(FETCH, { user_id: session.user.id });
  return NextResponse.json({
    count: data.unread.aggregate?.count ?? 0,
    recent: data.recent,
  });
}
