// GET /api/ical/[token] — public iCalendar feed. Token-protected.
// Apple Calendar / Google Calendar / Outlook can "Subscribe" to this URL
// and see live tasks + events for the rabbi.

import { hasuraAdmin } from '@/lib/hasura';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FETCH_BY_TOKEN = /* GraphQL */ `
  query FetchByIcalToken($token: uuid!) {
    users(
      where: { ical_subscription_token: { _eq: $token }, deactivated_at: { _is_null: true } }
      limit: 1
    ) {
      id name
      memberships(
        where: { status: { _eq: active } }
        order_by: { joined_at: asc } limit: 1
      ) {
        role
        community { id name timezone }
      }
    }
  }
`;

const FETCH_RABBI_FEED = /* GraphQL */ `
  query RabbiFeed($community_id: uuid!, $user_id: uuid!) {
    tasks: rabbi_tasks(
      where: {
        community_id: { _eq: $community_id }
        assigned_to_user_id: { _eq: $user_id }
        status: { _eq: open }
      }
      order_by: { due_date: asc_nulls_last } limit: 200
    ) {
      id title body due_date due_at created_at
    }
    events(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: published }
        starts_at: { _gte: "now()" }
      }
      order_by: { starts_at: asc } limit: 100
    ) {
      id title description starts_at ends_at location_text
    }
  }
`;

const FETCH_MEMBER_FEED = /* GraphQL */ `
  query MemberFeed($community_id: uuid!) {
    events(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: published }
        starts_at: { _gte: "now()" }
      }
      order_by: { starts_at: asc } limit: 100
    ) {
      id title description starts_at ends_at location_text
    }
  }
`;

function icalEscape(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcsUtc(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '');
}

function foldLines(lines: string[]): string {
  // ICS wants <=75 octets per line; fold continuations with CRLF + space.
  const folded: string[] = [];
  for (const l of lines) {
    if (l.length <= 75) { folded.push(l); continue; }
    let rest = l;
    folded.push(rest.slice(0, 75));
    rest = rest.slice(75);
    while (rest.length > 0) {
      folded.push(' ' + rest.slice(0, 74));
      rest = rest.slice(74);
    }
  }
  return folded.join('\r\n');
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return new Response('Invalid token', { status: 400 });
  }

  // Look up the user.
  const u = await hasuraAdmin.request<{
    users: Array<{
      id: string; name: string | null;
      memberships: Array<{
        role: string;
        community: { id: string; name: string; timezone: string } | null;
      }>;
    }>;
  }>(FETCH_BY_TOKEN, { token });

  const user = u.users[0];
  if (!user || !user.memberships[0]?.community) {
    return new Response('Not found', { status: 404 });
  }

  const community = user.memberships[0].community;
  const role = user.memberships[0].role;
  const isRabbi = role === 'rabbi' || role === 'admin';

  // Build calendar
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Menorah Global//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icalEscape(`Menorah · ${community.name}${isRabbi ? ' (Rabbi)' : ''}`)}`,
    `X-WR-TIMEZONE:${community.timezone}`,
  ];

  const now = toIcsUtc(new Date());

  // ── Rabbi tasks (only for rabbis) ──
  if (isRabbi) {
    const r = await hasuraAdmin.request<{
      tasks: Array<{
        id: string; title: string; body: string | null;
        due_date: string | null; due_at: string | null; created_at: string;
      }>;
      events: Array<{
        id: string; title: string; description: string | null;
        starts_at: string; ends_at: string | null; location_text: string | null;
      }>;
    }>(FETCH_RABBI_FEED, {
      community_id: community.id, user_id: user.id,
    });

    for (const t of r.tasks) {
      const stamp = toIcsUtc(t.created_at);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${t.id}@menorah-global`);
      lines.push(`DTSTAMP:${stamp}`);
      if (t.due_at) {
        const end = toIcsUtc(new Date(new Date(t.due_at).getTime() + 30 * 60_000));
        lines.push(`DTSTART:${toIcsUtc(t.due_at)}`);
        lines.push(`DTEND:${end}`);
      } else if (t.due_date) {
        const next = new Date(new Date(t.due_date).getTime() + 86_400_000)
          .toISOString().slice(0, 10);
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(t.due_date)}`);
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(next)}`);
      } else {
        const todayIso = new Date().toISOString().slice(0, 10);
        const nextIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(todayIso)}`);
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextIso)}`);
      }
      lines.push(`SUMMARY:${icalEscape('📝 ' + t.title)}`);
      if (t.body) lines.push(`DESCRIPTION:${icalEscape(t.body)}`);
      lines.push('CATEGORIES:Menorah,Tasks');
      lines.push('END:VEVENT');
    }

    for (const e of r.events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:event-${e.id}@menorah-global`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${toIcsUtc(e.starts_at)}`);
      lines.push(`DTEND:${toIcsUtc(e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600_000).toISOString())}`);
      lines.push(`SUMMARY:${icalEscape('✦ ' + e.title)}`);
      if (e.description) lines.push(`DESCRIPTION:${icalEscape(e.description)}`);
      if (e.location_text) lines.push(`LOCATION:${icalEscape(e.location_text)}`);
      lines.push('CATEGORIES:Menorah,Events');
      lines.push('END:VEVENT');
    }
  } else {
    // ── Plain member: only community events ──
    const r = await hasuraAdmin.request<{
      events: Array<{
        id: string; title: string; description: string | null;
        starts_at: string; ends_at: string | null; location_text: string | null;
      }>;
    }>(FETCH_MEMBER_FEED, { community_id: community.id });

    for (const e of r.events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:event-${e.id}@menorah-global`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${toIcsUtc(e.starts_at)}`);
      lines.push(`DTEND:${toIcsUtc(e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600_000).toISOString())}`);
      lines.push(`SUMMARY:${icalEscape('✦ ' + e.title)}`);
      if (e.description) lines.push(`DESCRIPTION:${icalEscape(e.description)}`);
      if (e.location_text) lines.push(`LOCATION:${icalEscape(e.location_text)}`);
      lines.push('CATEGORIES:Menorah,Events');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');

  return new Response(foldLines(lines), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="menorah-${community.name.replace(/[^a-z0-9]/gi, '-')}.ics"`,
      'Cache-Control': 'public, max-age=900',
    },
  });
}
