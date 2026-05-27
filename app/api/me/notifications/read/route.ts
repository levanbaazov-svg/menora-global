// POST /api/me/notifications/read { ids?: string[] }
// If ids is omitted → mark all unread as read.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';

const Body = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

const MARK_BY_IDS = /* GraphQL */ `
  mutation MarkByIds($user_id: uuid!, $ids: [uuid!]!) {
    update_notifications(
      where: { recipient_user_id: { _eq: $user_id }, id: { _in: $ids }, read_at: { _is_null: true } }
      _set: { read_at: "now()" }
    ) { affected_rows }
  }
`;

const MARK_ALL = /* GraphQL */ `
  mutation MarkAll($user_id: uuid!) {
    update_notifications(
      where: { recipient_user_id: { _eq: $user_id }, read_at: { _is_null: true } }
      _set: { read_at: "now()" }
    ) { affected_rows }
  }
`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const userId = session.user.id;
  if (parsed.data.ids && parsed.data.ids.length > 0) {
    const r = await hasuraAdmin.request<{ update_notifications: { affected_rows: number } }>(
      MARK_BY_IDS, { user_id: userId, ids: parsed.data.ids },
    );
    return NextResponse.json({ ok: true, marked: r.update_notifications.affected_rows });
  }
  const r = await hasuraAdmin.request<{ update_notifications: { affected_rows: number } }>(
    MARK_ALL, { user_id: userId },
  );
  return NextResponse.json({ ok: true, marked: r.update_notifications.affected_rows });
}
